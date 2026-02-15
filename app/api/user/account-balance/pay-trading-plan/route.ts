import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import {
  createAccountBalanceEntry,
  getAccountBalanceAssetSummary,
  getAccountBalanceSummary,
  hasSettledEntryForReference,
} from '@/lib/account-balance'
import { convertUsdToCoin, getTrackedCryptoPricesUsd, type TrackedAssetCoin } from '@/lib/crypto-prices'
import { logUserActivity } from '@/lib/user-activity'
import {
  isInputValidationError,
  readJsonObject,
  readNumberField,
  readStringField,
} from '@/lib/requestValidation'

const PAY_TRADING_PLAN_FIELDS = ['tradingUserPlanId', 'coinType'] as const
const PAYABLE_COINS = ['BTC', 'ETH', 'SOL', 'USDT'] as const

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await readJsonObject(req, { allowedKeys: PAY_TRADING_PLAN_FIELDS })
    const tradingUserPlanId = readNumberField(body, 'tradingUserPlanId', {
      required: true,
      integer: true,
      min: 1,
    })!
    const selectedCoin =
      (readStringField(body, 'coinType', {
        toUpperCase: true,
        enumValues: PAYABLE_COINS,
      }) as TrackedAssetCoin | undefined) ?? 'USDT'

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const tradingPlan = await prisma.tradingUserPlan.findFirst({
      where: { id: tradingUserPlanId, userId: user.id },
      include: { plan: true },
    })
    if (!tradingPlan) {
      return NextResponse.json({ error: 'Trading plan not found.' }, { status: 404 })
    }

    if (!['selected', 'awaiting_payment'].includes(tradingPlan.status) || tradingPlan.paymentStatus !== 'pending') {
      return NextResponse.json({ error: 'This trading plan is not awaiting payment.' }, { status: 409 })
    }

    const investmentUsd = Number(tradingPlan.investmentUsd)
    const summary = await getAccountBalanceSummary(user.id)
    if (summary.availableToSpendUsd < investmentUsd) {
      return NextResponse.json(
        { error: `Insufficient account balance. Available: $${summary.availableToSpendUsd.toFixed(2)}.` },
        { status: 400 }
      )
    }

    const cryptoPrices = await getTrackedCryptoPricesUsd()
    const assetSummary = await getAccountBalanceAssetSummary(user.id, cryptoPrices)
    const requiredCoinAmount = convertUsdToCoin(investmentUsd, selectedCoin, cryptoPrices)
    const availableCoinAmount = assetSummary.byCoin[selectedCoin]?.netCrypto ?? 0

    if (requiredCoinAmount <= 0 || cryptoPrices[selectedCoin] <= 0) {
      return NextResponse.json({ error: `Unable to resolve ${selectedCoin} conversion rate.` }, { status: 400 })
    }

    if (availableCoinAmount + 0.00000001 < requiredCoinAmount) {
      return NextResponse.json(
        {
          error: `Insufficient ${selectedCoin} wallet balance. Available: ${availableCoinAmount.toFixed(8)} ${selectedCoin}.`,
        },
        { status: 400 }
      )
    }

    const debitReference = `trading-plan:${tradingPlan.id}`
    const alreadyDebited = await hasSettledEntryForReference(user.id, debitReference, 'debit')
    if (alreadyDebited) {
      return NextResponse.json({ error: 'This trading plan has already been funded from account balance.' }, { status: 409 })
    }

    await prisma.$transaction(async tx => {
      await createAccountBalanceEntry(
        {
          userId: user.id,
          direction: 'debit',
          status: 'settled',
          amountUsd: investmentUsd,
          source: 'trading_plan_purchase',
          referenceId: debitReference,
          note: `Account balance used for ${tradingPlan.plan.name}.`,
          metadata: {
            tradingUserPlanId: tradingPlan.id,
            coinType: selectedCoin,
            amountCrypto: requiredCoinAmount,
            usdPriceAtSettlement: cryptoPrices[selectedCoin],
          },
        },
        tx
      )

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

      const existingStats = await tx.tradingStat.findFirst({
        where: { tradingUserPlanId: tradingPlan.id },
      })

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

      const existingEarnings = await tx.tradingEarning.findFirst({
        where: { tradingUserPlanId: tradingPlan.id },
      })

      if (!existingEarnings) {
        await tx.tradingEarning.create({
          data: {
            userId: tradingPlan.userId,
            tradingUserPlanId: tradingPlan.id,
            totalEarnedUsd: 0,
            dailyEstimateUsd: Number(tradingPlan.expectedReturnUsd) / (tradingPlan.durationHours / 24),
            isActive: true,
          },
        })
      }

      const existingPayment = await tx.tradingPayment.findFirst({
        where: { tradingUserPlanId: tradingPlan.id, status: 'pending' },
        orderBy: { createdAt: 'desc' },
      })

      if (existingPayment) {
        await tx.tradingPayment.update({
          where: { id: existingPayment.id },
          data: {
            cryptoType: selectedCoin,
            transactionId: 'Account Balance',
            status: 'confirmed',
            confirmations: 999,
            confirmedByAdminId: null,
            confirmedAt: new Date(),
          },
        })
      } else {
        await tx.tradingPayment.create({
          data: {
            userId: tradingPlan.userId,
            tradingUserPlanId: tradingPlan.id,
            amountUsd: tradingPlan.investmentUsd,
            cryptoType: selectedCoin,
            walletAddress: 'Account Balance',
            transactionId: 'Account Balance',
            status: 'confirmed',
            confirmations: 999,
            confirmedAt: new Date(),
          },
        })
      }
    })

    await logUserActivity({
      userId: user.id,
      action: 'AccountBalanceTradingPurchase',
      detail: `Activated ${tradingPlan.plan.name} using account balance.`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Pay trading plan from account balance error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
