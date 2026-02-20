import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { logUserActivity } from '@/lib/user-activity'
import {
  createAccountBalanceEntry,
  getAccountBalanceEntries,
  hasSettledEntryForReference,
} from '@/lib/account-balance'
import {
  convertUsdToCoin,
  getTrackedCryptoPricesUsd,
  isTrackedAssetCoin,
  type TrackedAssetCoin,
} from '@/lib/crypto-prices'
import { sendTradingPlanActivatedEmail } from '@/lib/transactional-email'
import {
  isInputValidationError,
  readJsonObject,
  readNumberField,
  readStringField,
} from '@/lib/requestValidation'

const APPROVE_TRADING_PAYMENT_FIELDS = ['tradingUserPlanId', 'txid'] as const
type UnsafeTx = Prisma.TransactionClient & Record<string, any>

const isAccountBalancePending = (txid: string | null | undefined) =>
  typeof txid === 'string' && txid.startsWith('Account Balance - Pending')

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUser = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    })

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await readJsonObject(req, { allowedKeys: APPROVE_TRADING_PAYMENT_FIELDS })
    const tradingUserPlanId = readNumberField(body, 'tradingUserPlanId', {
      required: true,
      integer: true,
      min: 1,
    })!
    const txid = readStringField(body, 'txid', { maxLength: 80 })

    const tradingPlan = await prisma.tradingUserPlan.findUnique({
      where: { id: tradingUserPlanId },
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

    if (!tradingPlan) {
      return NextResponse.json({ error: 'Trading plan not found' }, { status: 404 })
    }

    if (!['awaiting_payment', 'selected'].includes(tradingPlan.status) || tradingPlan.paymentStatus !== 'pending') {
      return NextResponse.json({ error: 'Payment already processed for this plan.' }, { status: 409 })
    }

    const pendingPayment = tradingPlan.payments[0] ?? null
    const balancePayment = isAccountBalancePending(pendingPayment?.transactionId)

    if (txid && !balancePayment) {
      const isHex64 = /^[a-fA-F0-9]{64}$/.test(txid)
      const isEthTx = /^0x[a-fA-F0-9]{64}$/.test(txid)
      if (!(isHex64 || isEthTx)) {
        return NextResponse.json({ error: 'TXID format looks invalid.' }, { status: 400 })
      }
    }

    const trackedPrices = await getTrackedCryptoPricesUsd()
    const purchaseRef = `trading-plan:${tradingPlan.id}`

    await prisma.$transaction(
      async (tx: UnsafeTx) => {
        let paymentCoin: TrackedAssetCoin = 'USDT'
        let settledAmountCrypto = 0
        let isMixedBalancePayment = false

        if (balancePayment) {
        const entries = await getAccountBalanceEntries(tradingPlan.userId, { limit: 3000 }, tx)
        const latestByReference = new Map<string, (typeof entries)[number]>()
        for (const entry of entries) {
          if (entry.source !== 'trading_plan_purchase' || entry.direction !== 'debit') continue
          const metadataPlanId = Number(entry.metadata?.tradingUserPlanId)
          const matchesPlanByMetadata = Number.isFinite(metadataPlanId) && metadataPlanId === tradingPlan.id
          const matchesPlanByReference =
            entry.referenceId === purchaseRef || entry.referenceId.startsWith(`${purchaseRef}:`)
          if (!matchesPlanByMetadata && !matchesPlanByReference) continue
          const current = latestByReference.get(entry.referenceId)
          if (!current || current.createdAt.getTime() < entry.createdAt.getTime()) {
            latestByReference.set(entry.referenceId, entry)
          }
        }

        const latestSegments = [...latestByReference.values()]
        if (latestSegments.some(entry => entry.status === 'settled')) {
          throw new Error('This trading plan has already been funded from account balance.')
        }

        const pendingSegments = latestSegments
          .filter(entry => entry.status === 'pending')
          .sort((a, b) => b.amountUsd - a.amountUsd)

        if (!pendingSegments.length) {
          throw new Error('No pending account-balance debit found for this trading plan.')
        }

        isMixedBalancePayment = pendingSegments.length > 1
        const primarySegment = pendingSegments[0]
        const primaryRawCoin =
          typeof primarySegment.metadata?.coinType === 'string'
            ? primarySegment.metadata.coinType.toUpperCase()
            : (pendingPayment?.cryptoType || 'USDT').toUpperCase()
        paymentCoin = isTrackedAssetCoin(primaryRawCoin) ? primaryRawCoin : 'USDT'

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
            paymentCoin = segmentCoin
            settledAmountCrypto = segmentAmountCrypto
          }

          await createAccountBalanceEntry(
            {
              userId: tradingPlan.userId,
              direction: 'debit',
              status: 'settled',
              amountUsd: Number(pendingSegment.amountUsd),
              source: 'trading_plan_purchase',
              referenceId: pendingSegment.referenceId,
              note: `Trading plan payment approved (${tradingPlan.plan.name}).`,
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
        const paymentCoinRaw = (pendingPayment?.cryptoType || 'USDT').toUpperCase()
        paymentCoin = isTrackedAssetCoin(paymentCoinRaw) ? paymentCoinRaw : 'USDT'
        settledAmountCrypto = convertUsdToCoin(Number(tradingPlan.investmentUsd), paymentCoin, trackedPrices)

        const externalPaymentRef = `external-trading-payment:${pendingPayment?.id ?? `tp-${tradingPlan.id}`}`
        const hasExternalCredit = await hasSettledEntryForReference(
          tradingPlan.userId,
          externalPaymentRef,
          'credit',
          tx
        )
        const hasPurchaseDebit = await hasSettledEntryForReference(tradingPlan.userId, purchaseRef, 'debit', tx)

        if (!hasExternalCredit) {
          await createAccountBalanceEntry(
            {
              userId: tradingPlan.userId,
              direction: 'credit',
              status: 'settled',
              amountUsd: Number(tradingPlan.investmentUsd),
              source: 'external_trading_payment',
              referenceId: externalPaymentRef,
              note: 'External trading payment approved.',
              metadata: {
                tradingUserPlanId: tradingPlan.id,
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
              userId: tradingPlan.userId,
              direction: 'debit',
              status: 'settled',
              amountUsd: Number(tradingPlan.investmentUsd),
              source: 'trading_plan_purchase',
              referenceId: purchaseRef,
              note: `Trading plan purchase settled for ${tradingPlan.plan.name}.`,
              metadata: {
                tradingUserPlanId: tradingPlan.id,
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
        const endDate = new Date(startDate.getTime() + tradingPlan.durationHours * 60 * 60 * 1000)

        await tx.tradingUserPlan.update({
        where: { id: tradingPlan.id },
        data: {
          status: 'active',
          paymentStatus: 'confirmed',
          startDate,
          endDate,
        },
      })

        await tx.user.update({
        where: { id: tradingPlan.userId },
        data: { accountStatus: 'active' },
      })

        const existingStats = await tx.tradingStat.findFirst({ where: { tradingUserPlanId: tradingPlan.id } })
        if (!existingStats) {
          await tx.tradingStat.create({
          data: {
            userId: tradingPlan.userId,
            tradingUserPlanId: tradingPlan.id,
            isActive: true,
            botSpeed: 1.0,
            strategy: 'Portfolio Balance',
            riskLevel: 'balanced',
          },
        })
      }

        const existingEarnings = await tx.tradingEarning.findFirst({ where: { tradingUserPlanId: tradingPlan.id } })
        if (!existingEarnings) {
          const durationDays = Math.max(1, tradingPlan.durationHours / 24)
          await tx.tradingEarning.create({
          data: {
            userId: tradingPlan.userId,
            tradingUserPlanId: tradingPlan.id,
            totalEarnedUsd: 0,
            dailyEstimateUsd: Number(tradingPlan.expectedReturnUsd) / durationDays,
            isActive: true,
          },
        })
      }

        if (pendingPayment) {
          await tx.tradingPayment.update({
          where: { id: pendingPayment.id },
          data: {
            amountUsd: tradingPlan.investmentUsd,
            cryptoType: balancePayment
              ? isMixedBalancePayment
                ? 'MIXED'
                : paymentCoin
              : (isTrackedAssetCoin((pendingPayment.cryptoType || '').toUpperCase())
                  ? (pendingPayment.cryptoType || '').toUpperCase()
                  : null) || 'USDT',
            walletAddress: balancePayment ? 'Account Balance' : pendingPayment.walletAddress || 'Approved',
            transactionId: balancePayment ? 'Account Balance - Approved' : txid || pendingPayment.transactionId || 'Manual Approval',
            status: 'confirmed',
            confirmations: 999,
            confirmedByAdminId: adminUser.id,
            confirmedAt: new Date(),
          },
        })
        } else {
          await tx.tradingPayment.create({
          data: {
            userId: tradingPlan.userId,
            tradingUserPlanId: tradingPlan.id,
            amountUsd: tradingPlan.investmentUsd,
            cryptoType: balancePayment
              ? isMixedBalancePayment
                ? 'MIXED'
                : paymentCoin
              : 'USDT',
            walletAddress: balancePayment ? 'Account Balance' : 'Approved',
            transactionId: balancePayment ? 'Account Balance - Approved' : txid || 'Manual Approval',
            status: 'confirmed',
            confirmations: 999,
            confirmedByAdminId: adminUser.id,
            confirmedAt: new Date(),
          },
        })
        }
      },
      { maxWait: 5_000, timeout: 30_000 }
    )

    await logUserActivity({
      userId: tradingPlan.userId,
      action: 'TradingPaymentApproved',
      detail: `Payment approved for ${tradingPlan.plan.name}.`,
    })

    await prisma.adminActivityLog.create({
      data: {
        actorAdminId: adminUser.id,
        targetUserId: tradingPlan.userId,
        action: 'approveTradingPayment',
        detail: `Trading payment approved for ${tradingPlan.plan.name}.`,
      },
    })

    if (tradingPlan.user.email) {
      await sendTradingPlanActivatedEmail({
        to: tradingPlan.user.email,
        fullName: tradingPlan.user.fullName,
        planName: tradingPlan.plan.name,
        durationHours: tradingPlan.durationHours,
        amountUsd: Number(tradingPlan.investmentUsd),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error approving trading payment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
