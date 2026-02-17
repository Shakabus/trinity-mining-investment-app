import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { logUserActivity } from '@/lib/user-activity'
import { scalePlanHashrateDecimal } from '@/lib/mining-hashrate'
import {
  createAccountBalanceEntry,
  getAccountBalanceEntries,
  hasSettledEntryForReference,
} from '@/lib/account-balance'
import { getCryptoPricesUsd } from '@/lib/earnings'
import { computeTargetDailyCryptoEstimate } from '@/lib/mining-engine'
import {
  convertUsdToCoin,
  getTrackedCryptoPricesUsd,
  isTrackedAssetCoin,
  type TrackedAssetCoin,
} from '@/lib/crypto-prices'
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

const isAccountBalancePending = (txid: string | null | undefined) =>
  typeof txid === 'string' && txid.startsWith('Account Balance - Pending')

export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUser = await prisma.user.findUnique({ where: { clerkUserId: userId } })

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await readJsonObject(req, { allowedKeys: APPROVE_PAYMENT_FIELDS })
    const userPlanId = readNumberField(body, 'userPlanId', { required: true, integer: true, min: 1 })!
    const txid = readStringField(body, 'txid', { maxLength: 80 })

    const userPlan = await prisma.userPlan.findUnique({
      where: { id: userPlanId },
      include: {
        user: true,
        plan: true,
        payments: {
          where: { status: 'pending' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!userPlan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    if (userPlan.status !== 'awaiting_payment' || userPlan.paymentStatus !== 'pending') {
      return NextResponse.json({ error: 'Payment already processed for this plan.' }, { status: 409 })
    }

    const pendingPayment = userPlan.payments[0] ?? null
    const balancePayment = isAccountBalancePending(pendingPayment?.transactionId)

    if (txid && !balancePayment) {
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

    const trackedPrices = await getTrackedCryptoPricesUsd()
    const miningPrices = await getCryptoPricesUsd()
    const purchaseRef = `mining-plan:${userPlan.id}`

    await prisma.$transaction(async tx => {
      let paymentCoin: TrackedAssetCoin = 'BTC'
      let settledAmountCrypto = 0
      let isMixedBalancePayment = false

      if (balancePayment) {
        const balanceEntries = await getAccountBalanceEntries(userPlan.userId, { limit: 3000 }, tx)
        const latestByReference = new Map<string, (typeof balanceEntries)[number]>()
        for (const entry of balanceEntries) {
          if (entry.source !== 'mining_plan_purchase' || entry.direction !== 'debit') continue
          if (Number(entry.metadata?.userPlanId) !== userPlan.id) continue
          const current = latestByReference.get(entry.referenceId)
          if (!current || current.createdAt.getTime() < entry.createdAt.getTime()) {
            latestByReference.set(entry.referenceId, entry)
          }
        }

        const latestSegments = [...latestByReference.values()]
        if (latestSegments.some(entry => entry.status === 'settled')) {
          throw new Error('This plan has already been funded from account balance.')
        }

        const pendingSegments = latestSegments
          .filter(entry => entry.status === 'pending')
          .sort((a, b) => b.amountUsd - a.amountUsd)

        if (!pendingSegments.length) {
          throw new Error('No pending account-balance debit found for this plan.')
        }

        isMixedBalancePayment = pendingSegments.length > 1
        const primarySegment = pendingSegments[0]
        const primaryRawCoin =
          typeof primarySegment.metadata?.coinType === 'string'
            ? primarySegment.metadata.coinType.toUpperCase()
            : userPlan.plan.coinType.toUpperCase()
        paymentCoin = isTrackedAssetCoin(primaryRawCoin) ? primaryRawCoin : 'BTC'

        for (const pendingSegment of pendingSegments) {
          const rawCoin =
            typeof pendingSegment.metadata?.coinType === 'string'
              ? pendingSegment.metadata.coinType.toUpperCase()
              : paymentCoin
          const segmentCoin = isTrackedAssetCoin(rawCoin) ? rawCoin : paymentCoin
          const amountCryptoFromEntry = Number(pendingSegment.metadata?.amountCrypto)
          const segmentAmountCrypto =
            Number.isFinite(amountCryptoFromEntry) && amountCryptoFromEntry > 0
              ? Number(amountCryptoFromEntry.toFixed(8))
              : convertUsdToCoin(Number(pendingSegment.amountUsd), segmentCoin, trackedPrices)

          if (pendingSegment.referenceId === primarySegment.referenceId) {
            settledAmountCrypto = segmentAmountCrypto
            paymentCoin = segmentCoin
          }

          await createAccountBalanceEntry(
            {
              userId: userPlan.userId,
              direction: 'debit',
              status: 'settled',
              amountUsd: Number(pendingSegment.amountUsd),
              source: 'mining_plan_purchase',
              referenceId: pendingSegment.referenceId,
              note: `Mining plan payment approved (${userPlan.plan.name}).`,
              metadata: {
                ...(pendingSegment.metadata ?? {}),
                coinType: segmentCoin,
                amountCrypto: segmentAmountCrypto,
                usdPriceAtSettlement: trackedPrices[segmentCoin],
                reviewedByAdminId: adminUser.id,
                reviewedAt: new Date().toISOString(),
              },
            },
            tx
          )
        }
      } else {
        const paymentCoinRaw = (pendingPayment?.cryptoType || userPlan.plan.coinType || 'BTC').toUpperCase()
        paymentCoin = isTrackedAssetCoin(paymentCoinRaw) ? paymentCoinRaw : 'BTC'

        const amountCryptoFromPayment = Number((pendingPayment as { amountCrypto?: unknown } | null)?.amountCrypto ?? 0)
        settledAmountCrypto =
          Number.isFinite(amountCryptoFromPayment) && amountCryptoFromPayment > 0
            ? Number(amountCryptoFromPayment.toFixed(8))
            : convertUsdToCoin(Number(userPlan.finalPrice), paymentCoin, trackedPrices)

        const externalPaymentRef = `external-payment:${pendingPayment?.id ?? `up-${userPlan.id}`}`
        const hasExternalCredit = await hasSettledEntryForReference(
          userPlan.userId,
          externalPaymentRef,
          'credit',
          tx
        )
        const hasPurchaseDebit = await hasSettledEntryForReference(userPlan.userId, purchaseRef, 'debit', tx)

        if (!hasExternalCredit) {
          await createAccountBalanceEntry(
            {
              userId: userPlan.userId,
              direction: 'credit',
              status: 'settled',
              amountUsd: Number(userPlan.finalPrice),
              source: 'external_payment',
              referenceId: externalPaymentRef,
              note: 'External mining payment approved.',
              metadata: {
                userPlanId: userPlan.id,
                paymentId: pendingPayment?.id,
                coinType: paymentCoin,
                amountCrypto: settledAmountCrypto,
                usdPriceAtSettlement: trackedPrices[paymentCoin],
              },
            },
            tx
          )
        }

        if (!hasPurchaseDebit) {
          await createAccountBalanceEntry(
            {
              userId: userPlan.userId,
              direction: 'debit',
              status: 'settled',
              amountUsd: Number(userPlan.finalPrice),
              source: 'mining_plan_purchase',
              referenceId: purchaseRef,
              note: `Mining plan purchase settled for ${userPlan.plan.name}.`,
              metadata: {
                userPlanId: userPlan.id,
                paymentId: pendingPayment?.id,
                coinType: paymentCoin,
                amountCrypto: settledAmountCrypto,
                usdPriceAtSettlement: trackedPrices[paymentCoin],
              },
            },
            tx
          )
        }
      }

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

      const existingStats = await tx.miningStats.findFirst({
        where: { userPlanId: userPlan.id },
        select: { id: true },
      })

      if (!existingStats) {
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
      }

      const existingEarningsCount = await tx.earnings.count({ where: { userPlanId: userPlan.id } })
      if (existingEarningsCount === 0) {
        const durationDays = Math.max(1, userPlan.selectedDurationDays || 7)

        if (userPlan.plan.coinType === 'MULTI') {
          const allocationSplits = [
            { coinType: 'BTC', ratio: 0.6, algorithm: 'SHA-256', hardwareModel: 'Antminer S21 Hydro' },
            { coinType: 'ETH', ratio: 0.25, algorithm: 'Ethash', hardwareModel: 'Enterprise GPU Cluster' },
            { coinType: 'LTC', ratio: 0.15, algorithm: 'Scrypt', hardwareModel: 'Antminer L7' },
          ]
          const scaledPlanHashrate = scalePlanHashrateDecimal(userPlan.plan.baseHashrate)

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
            data: allocationSplits.map(split => {
              const coinPrice = miningPrices[split.coinType as 'BTC' | 'ETH' | 'LTC'] || 0
              const dailyEstimateCrypto = computeTargetDailyCryptoEstimate({
                planSlug: userPlan.plan.slug,
                finalPriceUsd: Number(userPlan.finalPrice),
                durationDays,
                coinUsdPrice: coinPrice,
                allocationWeight: split.ratio,
              })
              return {
                userId: userPlan.userId,
                userPlanId: userPlan.id,
                coinType: split.coinType,
                dailyEstimateUsd: coinPrice > 0 ? dailyEstimateCrypto * coinPrice : 0,
                dailyEstimateCrypto,
                totalEarnedUsd: 0,
                totalEarnedCrypto: 0,
                isActive: true,
              }
            }),
          })
        } else {
          const coinPrice = miningPrices[userPlan.plan.coinType as 'BTC' | 'ETH' | 'LTC'] || 0
          const dailyEstimateCrypto = computeTargetDailyCryptoEstimate({
            planSlug: userPlan.plan.slug,
            finalPriceUsd: Number(userPlan.finalPrice),
            durationDays,
            coinUsdPrice: coinPrice,
          })

          await tx.earnings.create({
            data: {
              userId: userPlan.userId,
              userPlanId: userPlan.id,
              coinType: userPlan.plan.coinType,
              dailyEstimateUsd: coinPrice > 0 ? dailyEstimateCrypto * coinPrice : 0,
              dailyEstimateCrypto,
              totalEarnedUsd: 0,
              totalEarnedCrypto: 0,
              isActive: true,
            },
          })
        }
      }

      if (pendingPayment) {
        await tx.payment.update({
          where: { id: pendingPayment.id },
          data: {
            amountUsd: userPlan.finalPrice,
            amountCrypto: balancePayment && isMixedBalancePayment ? null : settledAmountCrypto,
            cryptoType:
              balancePayment
                ? isMixedBalancePayment
                  ? 'MIXED'
                  : paymentCoin
                : (isTrackedAssetCoin((pendingPayment.cryptoType || '').toUpperCase())
                    ? (pendingPayment.cryptoType || '').toUpperCase()
                    : null) ||
                  (isTrackedAssetCoin(userPlan.plan.coinType.toUpperCase())
                    ? userPlan.plan.coinType.toUpperCase()
                    : 'BTC'),
            walletAddress: balancePayment ? 'Account Balance' : pendingPayment.walletAddress || 'Approved',
            transactionId: balancePayment ? 'Account Balance - Approved' : txid || pendingPayment.transactionId || 'Manual Approval',
            status: 'confirmed',
            confirmations: 999,
            confirmedByAdminId: adminUser.id,
            confirmedAt: new Date(),
          },
        })
      } else {
        await tx.payment.create({
          data: {
            userId: userPlan.userId,
            userPlanId: userPlan.id,
            amountUsd: userPlan.finalPrice,
            amountCrypto: balancePayment && isMixedBalancePayment ? null : settledAmountCrypto,
            cryptoType: balancePayment
              ? isMixedBalancePayment
                ? 'MIXED'
                : paymentCoin
              : isTrackedAssetCoin(userPlan.plan.coinType.toUpperCase())
                ? userPlan.plan.coinType.toUpperCase()
                : 'BTC',
            walletAddress: balancePayment ? 'Account Balance' : 'Approved',
            transactionId: balancePayment ? 'Account Balance - Approved' : txid || 'Manual Approval',
            status: 'confirmed',
            confirmations: 999,
            confirmedByAdminId: adminUser.id,
            confirmedAt: new Date(),
          },
        })
      }

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
                paymentId: pendingPayment?.id,
                amountUsd: bonusAmount,
                status: 'available',
              },
            })
          }
        }
      }
    })

    await logUserActivity({
      userId: userPlan.userId,
      action: 'PaymentApproved',
      detail: `Payment approved for ${userPlan.plan.name} (${userPlan.selectedDurationDays} days).`,
    })

    return NextResponse.json({
      success: true,
      message: 'Payment approved and account activated',
    })
  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error approving payment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
