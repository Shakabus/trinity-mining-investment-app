import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { logUserActivity } from '@/lib/user-activity'
import { createAccountBalanceEntry, hasSettledEntryForReference } from '@/lib/account-balance'
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

const APPROVE_TRADING_PAYMENT_FIELDS = ['tradingUserPlanId', 'txid'] as const

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
      include: { user: true, plan: true },
    })

    if (!tradingPlan) {
      return NextResponse.json({ error: 'Trading plan not found' }, { status: 404 })
    }

    if (!['awaiting_payment', 'selected'].includes(tradingPlan.status) || tradingPlan.paymentStatus !== 'pending') {
      return NextResponse.json({ error: 'Payment already processed for this plan.' }, { status: 409 })
    }

    if (txid) {
      const isHex64 = /^[a-fA-F0-9]{64}$/.test(txid)
      const isEthTx = /^0x[a-fA-F0-9]{64}$/.test(txid)
      if (!(isHex64 || isEthTx)) {
        return NextResponse.json({ error: 'TXID format looks invalid.' }, { status: 400 })
      }
    }

    const startDate = new Date()
    const endDate = new Date(startDate.getTime() + tradingPlan.durationHours * 60 * 60 * 1000)

    await prisma.tradingUserPlan.update({
      where: { id: tradingPlan.id },
      data: {
        status: 'active',
        paymentStatus: 'confirmed',
        startDate,
        endDate,
      },
    })

    await prisma.user.update({
      where: { id: tradingPlan.userId },
      data: { accountStatus: 'active' },
    })

    const existingStats = await prisma.tradingStat.findFirst({
      where: { tradingUserPlanId: tradingPlan.id },
    })

    if (!existingStats) {
      await prisma.tradingStat.create({
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

    const existingEarnings = await prisma.tradingEarning.findFirst({
      where: { tradingUserPlanId: tradingPlan.id },
    })

    if (!existingEarnings) {
      await prisma.tradingEarning.create({
        data: {
          userId: tradingPlan.userId,
          tradingUserPlanId: tradingPlan.id,
          totalEarnedUsd: 0,
          dailyEstimateUsd: Number(tradingPlan.expectedReturnUsd) / (tradingPlan.durationHours / 24),
          isActive: true,
        },
      })
    }

    const existingPayment = await prisma.tradingPayment.findFirst({
      where: {
        tradingUserPlanId: tradingPlan.id,
        status: 'pending',
      },
      orderBy: { createdAt: 'desc' },
    })

    const payment = existingPayment
      ? await prisma.tradingPayment.update({
          where: { id: existingPayment.id },
          data: {
            transactionId: txid || existingPayment.transactionId || 'Manual Approval',
            status: 'confirmed',
            confirmations: 999,
            confirmedByAdminId: adminUser.id,
            confirmedAt: new Date(),
          },
        })
      : await prisma.tradingPayment.create({
          data: {
            userId: tradingPlan.userId,
            tradingUserPlanId: tradingPlan.id,
            amountUsd: tradingPlan.investmentUsd,
            cryptoType: 'USDT',
            walletAddress: 'Approved',
            transactionId: txid || 'Manual Approval',
            status: 'confirmed',
            confirmations: 999,
            confirmedByAdminId: adminUser.id,
            confirmedAt: new Date(),
          },
        })

    const externalPaymentRef = `external-trading-payment:${payment.id}`
    const purchaseRef = `trading-plan:${tradingPlan.id}`
    const rawCoin = (payment.cryptoType || 'USDT').toUpperCase()
    const paymentCoin: TrackedAssetCoin = isTrackedAssetCoin(rawCoin) ? rawCoin : 'USDT'
    const trackedPrices = await getTrackedCryptoPricesUsd()
    const settledAmountCrypto = convertUsdToCoin(Number(tradingPlan.investmentUsd), paymentCoin, trackedPrices)
    const hasExternalCredit = await hasSettledEntryForReference(tradingPlan.userId, externalPaymentRef, 'credit')
    const hasPurchaseDebit = await hasSettledEntryForReference(tradingPlan.userId, purchaseRef, 'debit')

    if (!hasExternalCredit) {
      await createAccountBalanceEntry({
        userId: tradingPlan.userId,
        direction: 'credit',
        status: 'settled',
        amountUsd: Number(tradingPlan.investmentUsd),
        source: 'external_trading_payment',
        referenceId: externalPaymentRef,
        note: 'External trading payment approved.',
        metadata: {
          tradingUserPlanId: tradingPlan.id,
          paymentId: payment.id,
          coinType: paymentCoin,
          amountCrypto: settledAmountCrypto,
          usdPriceAtSettlement: trackedPrices[paymentCoin],
        },
      })
    }

    if (!hasPurchaseDebit) {
      await createAccountBalanceEntry({
        userId: tradingPlan.userId,
        direction: 'debit',
        status: 'settled',
        amountUsd: Number(tradingPlan.investmentUsd),
        source: 'trading_plan_purchase',
        referenceId: purchaseRef,
        note: `Trading plan purchase settled for ${tradingPlan.plan.name}.`,
        metadata: {
          tradingUserPlanId: tradingPlan.id,
          paymentId: payment.id,
          coinType: paymentCoin,
          amountCrypto: settledAmountCrypto,
          usdPriceAtSettlement: trackedPrices[paymentCoin],
        },
      })
    }

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

    return NextResponse.json({ success: true })
  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error approving trading payment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
