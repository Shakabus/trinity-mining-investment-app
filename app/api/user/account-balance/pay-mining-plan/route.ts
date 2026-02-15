import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { scalePlanHashrateDecimal } from '@/lib/mining-hashrate'
import {
  createAccountBalanceEntry,
  getAccountBalanceSummary,
  hasSettledEntryForReference,
} from '@/lib/account-balance'
import { logUserActivity } from '@/lib/user-activity'
import {
  isInputValidationError,
  readJsonObject,
  readNumberField,
} from '@/lib/requestValidation'

const PAY_MINING_PLAN_FIELDS = ['userPlanId'] as const
const DEFAULT_REFERRAL_SETTINGS = {
  isEnabled: true,
  bonusPercent: 5,
  minPaymentUsd: 100,
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await readJsonObject(req, { allowedKeys: PAY_MINING_PLAN_FIELDS })
    const userPlanId = readNumberField(body, 'userPlanId', { required: true, integer: true, min: 1 })!

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const userPlan = await prisma.userPlan.findFirst({
      where: {
        id: userPlanId,
        userId: user.id,
      },
      include: { plan: true, user: true },
    })

    if (!userPlan) {
      return NextResponse.json({ error: 'Plan not found.' }, { status: 404 })
    }
    if (!['selected', 'awaiting_payment'].includes(userPlan.status) || userPlan.paymentStatus !== 'pending') {
      return NextResponse.json({ error: 'This plan is not awaiting payment.' }, { status: 409 })
    }

    const currentBalance = await getAccountBalanceSummary(user.id)
    const finalPriceUsd = Number(userPlan.finalPrice)
    if (currentBalance.availableToSpendUsd < finalPriceUsd) {
      return NextResponse.json(
        {
          error: `Insufficient account balance. Available: $${currentBalance.availableToSpendUsd.toFixed(2)}.`,
        },
        { status: 400 }
      )
    }

    const debitReference = `mining-plan:${userPlan.id}`
    const alreadyDebited = await hasSettledEntryForReference(user.id, debitReference, 'debit')
    if (alreadyDebited) {
      return NextResponse.json({ error: 'This plan has already been funded from account balance.' }, { status: 409 })
    }

    await prisma.$transaction(async tx => {
      await createAccountBalanceEntry(
        {
          userId: user.id,
          direction: 'debit',
          status: 'settled',
          amountUsd: finalPriceUsd,
          source: 'mining_plan_purchase',
          referenceId: debitReference,
          note: `Account balance used for ${userPlan.plan.name}.`,
          metadata: { userPlanId: userPlan.id },
        },
        tx
      )

      const priorConfirmedPayments = await tx.payment.count({
        where: { userId: userPlan.userId, status: 'confirmed' },
      })

      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + userPlan.selectedDurationDays)

      await tx.userPlan.update({
        where: { id: userPlan.id },
        data: {
          status: 'active',
          paymentStatus: 'confirmed',
          startDate,
          endDate,
        },
      })

      await tx.user.update({
        where: { id: userPlan.userId },
        data: { accountStatus: 'active' },
      })

      if (userPlan.upgradeFromPlanId) {
        await tx.userPlan.update({
          where: { id: userPlan.upgradeFromPlanId },
          data: {
            status: 'archived',
            endDate: new Date(),
          },
        })

        await tx.miningStats.updateMany({
          where: { userPlanId: userPlan.upgradeFromPlanId },
          data: { isActive: false },
        })

        await tx.earnings.updateMany({
          where: { userPlanId: userPlan.upgradeFromPlanId },
          data: {
            isHistorical: true,
            isWithdrawable: false,
          },
        })
      }

      const scaledPlanHashrate = scalePlanHashrateDecimal(userPlan.plan.baseHashrate)

      await tx.miningStats.create({
        data: {
          userId: userPlan.userId,
          userPlanId: userPlan.id,
          assignedHashrate: scaledPlanHashrate,
          hashrateUnit: userPlan.plan.hashrateUnit,
          counterSpeed: 0.001,
          algorithm: userPlan.plan.algorithm,
          miningPool: 'AntPool',
          dataCenterLocation: 'Canada (Hydro)',
          machineModel: userPlan.plan.hardwareModel,
          uptimePercentage: 99.9,
          isActive: true,
        },
      })

      if (userPlan.plan.coinType === 'MULTI') {
        const allocationSplits = [
          { coinType: 'BTC', ratio: 0.6, algorithm: 'SHA-256', hardwareModel: 'Antminer S21 Hydro' },
          { coinType: 'ETH', ratio: 0.25, algorithm: 'Ethash', hardwareModel: 'Enterprise GPU Cluster' },
          { coinType: 'LTC', ratio: 0.15, algorithm: 'Scrypt', hardwareModel: 'Antminer L7' },
        ]

        await tx.multiAssetAllocation.createMany({
          data: allocationSplits.map(split => ({
            userPlanId: userPlan.id,
            coinType: split.coinType,
            hashrate: scaledPlanHashrate.mul(split.ratio),
            hashrateUnit: userPlan.plan.hashrateUnit,
            algorithm: split.algorithm,
            hardwareModel: split.hardwareModel,
            maintenanceFee: userPlan.plan.maintenanceFeePerUnitDay,
            electricityCost: userPlan.plan.electricityCostPerUnitDay,
          })),
        })

        await tx.earnings.createMany({
          data: allocationSplits.map(split => ({
            userId: userPlan.userId,
            userPlanId: userPlan.id,
            coinType: split.coinType,
            dailyEstimateUsd: 0,
            dailyEstimateCrypto: 0,
            totalEarnedUsd: 0,
            totalEarnedCrypto: 0,
            isActive: true,
          })),
        })
      } else {
        await tx.earnings.create({
          data: {
            userId: userPlan.userId,
            userPlanId: userPlan.id,
            coinType: userPlan.plan.coinType,
            dailyEstimateUsd: 0,
            dailyEstimateCrypto: 0,
            totalEarnedUsd: 0,
            totalEarnedCrypto: 0,
            isActive: true,
          },
        })
      }

      const existingPayment = await tx.payment.findFirst({
        where: { userPlanId: userPlan.id, status: 'pending' },
        orderBy: { createdAt: 'desc' },
      })

      const payment = existingPayment
        ? await tx.payment.update({
            where: { id: existingPayment.id },
            data: {
              amountUsd: userPlan.finalPrice,
              cryptoType: existingPayment.cryptoType || userPlan.plan.coinType,
              transactionId: 'Account Balance',
              status: 'confirmed',
              confirmations: 999,
              confirmedByAdminId: null,
              confirmedAt: new Date(),
            },
          })
        : await tx.payment.create({
            data: {
              userId: userPlan.userId,
              userPlanId: userPlan.id,
              amountUsd: userPlan.finalPrice,
              cryptoType: userPlan.plan.coinType,
              walletAddress: 'Account Balance',
              transactionId: 'Account Balance',
              status: 'confirmed',
              confirmations: 999,
              confirmedAt: new Date(),
            },
          })

      if (priorConfirmedPayments === 0 && userPlan.user.referredById) {
        const existingBonus = await tx.referralBonus.findFirst({
          where: { refereeId: userPlan.userId },
        })

        if (!existingBonus) {
          const settingsRow = await tx.referralSettings.findFirst()
          const settings = settingsRow
            ? {
                isEnabled: settingsRow.isEnabled,
                bonusPercent: Number(settingsRow.bonusPercent),
                minPaymentUsd: Number(settingsRow.minPaymentUsd),
              }
            : DEFAULT_REFERRAL_SETTINGS

          const paymentAmountUsd = Number(userPlan.finalPrice)
          if (settings.isEnabled && paymentAmountUsd >= settings.minPaymentUsd) {
            const bonusAmount = (paymentAmountUsd * settings.bonusPercent) / 100
            await tx.referralBonus.create({
              data: {
                referrerId: userPlan.user.referredById,
                refereeId: userPlan.userId,
                paymentId: payment.id,
                amountUsd: bonusAmount,
                status: 'available',
              },
            })
          }
        }
      }
    })

    await logUserActivity({
      userId: user.id,
      action: 'AccountBalancePlanPurchase',
      detail: `Activated ${userPlan.plan.name} using account balance.`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Pay mining plan from account balance error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
