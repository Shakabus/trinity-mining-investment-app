import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { logUserActivity } from '@/lib/user-activity'
import { scalePlanHashrateDecimal } from '@/lib/mining-hashrate'
import { createAccountBalanceEntry, hasSettledEntryForReference } from '@/lib/account-balance'
import {
  isInputValidationError,
  readJsonObject,
  readNumberField,
  readStringField,
} from '@/lib/requestValidation'

const DEFAULT_REFERRAL_SETTINGS = {
  isEnabled: true,
  bonusPercent: 5,
  minPaymentUsd: 100,
}
const APPROVE_PAYMENT_FIELDS = ['userPlanId', 'txid'] as const

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const adminUser = await prisma.user.findUnique({
      where: { clerkUserId: userId }
    })

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await readJsonObject(req, { allowedKeys: APPROVE_PAYMENT_FIELDS })
    const userPlanId = readNumberField(body, 'userPlanId', { required: true, integer: true, min: 1 })!
    const txid = readStringField(body, 'txid', { maxLength: 80 })

    // Get the user plan
    const userPlan = await prisma.userPlan.findUnique({
      where: { id: userPlanId },
      include: { user: true, plan: true }
    })

    if (!userPlan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    if (userPlan.status !== 'awaiting_payment' || userPlan.paymentStatus !== 'pending') {
      return NextResponse.json({ error: 'Payment already processed for this plan.' }, { status: 409 })
    }

    if (txid) {
      const isHex64 = /^[a-fA-F0-9]{64}$/.test(txid)
      const isEthTx = /^0x[a-fA-F0-9]{64}$/.test(txid)
      const coin = userPlan.plan.coinType
      const isValid =
        coin === 'ETH'
          ? isEthTx
          : coin === 'BTC' || coin === 'LTC'
          ? isHex64
          : coin === 'MULTI'
          ? isHex64 || isEthTx
          : true

      if (!isValid) {
        return NextResponse.json({ error: 'TXID format looks invalid for this coin.' }, { status: 400 })
      }
    }

    const priorConfirmedPayments = await prisma.payment.count({
      where: { userId: userPlan.userId, status: 'confirmed' },
    })

    // Calculate start and end dates
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + userPlan.selectedDurationDays)

    // Update user plan to active
    await prisma.userPlan.update({
      where: { id: userPlanId },
      data: {
        status: 'active',
        paymentStatus: 'confirmed',
        startDate: startDate,
        endDate: endDate
      }
    })

    // Update user account status to active
    await prisma.user.update({
      where: { id: userPlan.userId },
      data: { accountStatus: 'active' }
    })

    if (userPlan.upgradeFromPlanId) {
      await prisma.userPlan.update({
        where: { id: userPlan.upgradeFromPlanId },
        data: {
          status: 'archived',
          endDate: new Date(),
        },
      })

      await prisma.miningStats.updateMany({
        where: { userPlanId: userPlan.upgradeFromPlanId },
        data: { isActive: false },
      })

      await prisma.earnings.updateMany({
        where: { userPlanId: userPlan.upgradeFromPlanId },
        data: {
          isHistorical: true,
          isWithdrawable: false,
        },
      })
    }

    const scaledPlanHashrate = scalePlanHashrateDecimal(userPlan.plan.baseHashrate)

    // Create mining stats for the user
    await prisma.miningStats.create({
      data: {
        userId: userPlan.userId,
        userPlanId: userPlan.id,
        assignedHashrate: scaledPlanHashrate,
        hashrateUnit: userPlan.plan.hashrateUnit,
        counterSpeed: 0.001, // Default counter speed
        algorithm: userPlan.plan.algorithm,
        miningPool: 'AntPool', // Default pool
        dataCenterLocation: 'Canada (Hydro)', // Default location
        machineModel: userPlan.plan.hardwareModel,
        uptimePercentage: 99.9,
        isActive: true
      }
    })

    if (userPlan.plan.coinType === 'MULTI') {
      const allocationSplits = [
        { coinType: 'BTC', ratio: 0.6, algorithm: 'SHA-256', hardwareModel: 'Antminer S21 Hydro' },
        { coinType: 'ETH', ratio: 0.25, algorithm: 'Ethash', hardwareModel: 'Enterprise GPU Cluster' },
        { coinType: 'LTC', ratio: 0.15, algorithm: 'Scrypt', hardwareModel: 'Antminer L7' },
      ]

      await prisma.multiAssetAllocation.createMany({
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

      await prisma.earnings.createMany({
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
      // Create earnings record
      await prisma.earnings.create({
        data: {
          userId: userPlan.userId,
          userPlanId: userPlan.id,
          coinType: userPlan.plan.coinType,
          dailyEstimateUsd: 0, // Admin can set this later
          dailyEstimateCrypto: 0,
          totalEarnedUsd: 0,
          totalEarnedCrypto: 0,
          isActive: true
        }
      })
    }

    const existingPayment = await prisma.payment.findFirst({
      where: {
        userPlanId: userPlan.id,
        status: 'pending',
      },
      orderBy: { createdAt: 'desc' },
    })

    const payment = existingPayment
      ? await prisma.payment.update({
          where: { id: existingPayment.id },
          data: {
            amountUsd: userPlan.finalPrice,
            cryptoType: existingPayment.cryptoType || userPlan.plan.coinType,
            transactionId: txid || existingPayment.transactionId || 'Manual Approval',
            status: 'confirmed',
            confirmations: 999,
            confirmedByAdminId: adminUser.id,
            confirmedAt: new Date(),
          },
        })
      : await prisma.payment.create({
          data: {
            userId: userPlan.userId,
            userPlanId: userPlan.id,
            amountUsd: userPlan.finalPrice,
            cryptoType: userPlan.plan.coinType,
            walletAddress: 'Approved',
            transactionId: txid || 'Manual Approval',
            status: 'confirmed',
            confirmations: 999,
            confirmedByAdminId: adminUser.id,
            confirmedAt: new Date(),
          },
        })

    const externalPaymentRef = `external-payment:${payment.id}`
    const purchaseRef = `mining-plan:${userPlan.id}`
    const hasExternalCredit = await hasSettledEntryForReference(userPlan.userId, externalPaymentRef, 'credit')
    const hasPurchaseDebit = await hasSettledEntryForReference(userPlan.userId, purchaseRef, 'debit')

    if (!hasExternalCredit) {
      await createAccountBalanceEntry({
        userId: userPlan.userId,
        direction: 'credit',
        status: 'settled',
        amountUsd: Number(userPlan.finalPrice),
        source: 'external_payment',
        referenceId: externalPaymentRef,
        note: 'External mining payment approved.',
        metadata: { userPlanId: userPlan.id, paymentId: payment.id },
      })
    }

    if (!hasPurchaseDebit) {
      await createAccountBalanceEntry({
        userId: userPlan.userId,
        direction: 'debit',
        status: 'settled',
        amountUsd: Number(userPlan.finalPrice),
        source: 'mining_plan_purchase',
        referenceId: purchaseRef,
        note: `Mining plan purchase settled for ${userPlan.plan.name}.`,
        metadata: { userPlanId: userPlan.id, paymentId: payment.id },
      })
    }

    if (priorConfirmedPayments === 0 && userPlan.user.referredById) {
      const existingBonus = await prisma.referralBonus.findFirst({
        where: {
          refereeId: userPlan.userId,
        },
      })

      if (!existingBonus) {
        const settingsRow = await prisma.referralSettings.findFirst()
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
          await prisma.referralBonus.create({
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

    await logUserActivity({
      userId: userPlan.userId,
      action: 'PaymentApproved',
      detail: `Payment approved for ${userPlan.plan.name} (${userPlan.selectedDurationDays} days).`,
    })

    return NextResponse.json({ 
      success: true,
      message: 'Payment approved and account activated'
    })

  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error approving payment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
