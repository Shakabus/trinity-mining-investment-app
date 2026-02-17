import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import {
  createAccountBalanceEntry,
  getAccountBalanceCoinAvailability,
  getAccountBalanceEntries,
  getAccountBalanceSummary,
  lockUserBalanceForUpdate,
} from '@/lib/account-balance'
import {
  TRACKED_ASSET_COINS,
  convertUsdToCoin,
  getTrackedCryptoPricesUsd,
  type TrackedAssetCoin,
} from '@/lib/crypto-prices'
import { logUserActivity } from '@/lib/user-activity'
import {
  isInputValidationError,
  readJsonObject,
  readNumberField,
  readStringField,
} from '@/lib/requestValidation'

const PAY_TRADING_PLAN_FIELDS = ['tradingUserPlanId', 'coinType'] as const
const PAYABLE_COINS = ['BTC', 'ETH', 'SOL', 'USDT'] as const

class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

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
    const requestedCoin =
      (readStringField(body, 'coinType', {
        toUpperCase: true,
        enumValues: PAYABLE_COINS,
      }) as TrackedAssetCoin | undefined) ?? null

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

    const cryptoPrices = await getTrackedCryptoPricesUsd()
    const investmentUsd = Number(tradingPlan.investmentUsd)
    const debitReference = `trading-plan:${tradingPlan.id}`

    await prisma.$transaction(async tx => {
      await lockUserBalanceForUpdate(user.id, tx)

      const summary = await getAccountBalanceSummary(user.id, tx)
      if (summary.availableToSpendUsd < investmentUsd) {
        throw new HttpError(
          400,
          `Insufficient account balance. Available: $${summary.availableToSpendUsd.toFixed(2)}.`
        )
      }

      const coinAvailability = await getAccountBalanceCoinAvailability(user.id, cryptoPrices, tx)
      const selectedCoin =
        requestedCoin ??
        [...TRACKED_ASSET_COINS]
          .sort(
            (a, b) =>
              (coinAvailability.byCoin[b]?.availableUsd ?? 0) -
              (coinAvailability.byCoin[a]?.availableUsd ?? 0)
          )
          .find(coin => (coinAvailability.byCoin[coin]?.availableUsd ?? 0) >= investmentUsd)

      if (!selectedCoin) {
        throw new HttpError(400, 'No funded wallet has enough available balance for this purchase.')
      }

      const requiredCoinAmount = convertUsdToCoin(investmentUsd, selectedCoin, cryptoPrices)
      const availableCoinAmount = coinAvailability.byCoin[selectedCoin]?.availableCrypto ?? 0

      if (requiredCoinAmount <= 0 || cryptoPrices[selectedCoin] <= 0) {
        throw new HttpError(400, `Unable to resolve ${selectedCoin} conversion rate.`)
      }

      if (availableCoinAmount + 0.00000001 < requiredCoinAmount) {
        throw new HttpError(
          400,
          `Insufficient ${selectedCoin} wallet balance. Available: ${availableCoinAmount.toFixed(8)} ${selectedCoin}.`
        )
      }

      const existingEntries = await getAccountBalanceEntries(user.id, { limit: 3000 }, tx)
      const latestPaymentEntry = existingEntries
        .filter(
          entry =>
            entry.referenceId === debitReference &&
            entry.source === 'trading_plan_purchase' &&
            entry.direction === 'debit'
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]

      if (latestPaymentEntry?.status === 'pending') {
        throw new HttpError(409, 'This account-balance payment is already pending admin approval.')
      }

      if (latestPaymentEntry?.status === 'settled') {
        throw new HttpError(409, 'This trading plan has already been funded from account balance.')
      }

      await createAccountBalanceEntry(
        {
          userId: user.id,
          direction: 'debit',
          status: 'pending',
          amountUsd: investmentUsd,
          source: 'trading_plan_purchase',
          referenceId: debitReference,
          note: `Account-balance payment submitted for ${tradingPlan.plan.name}.`,
          metadata: {
            tradingUserPlanId: tradingPlan.id,
            coinType: selectedCoin,
            amountCrypto: requiredCoinAmount,
            usdPriceAtRequest: cryptoPrices[selectedCoin],
          },
        },
        tx
      )

      await tx.tradingUserPlan.update({
        where: { id: tradingPlan.id },
        data: {
          status: 'awaiting_payment',
          paymentStatus: 'pending',
          startDate: null,
          endDate: null,
        },
      })

      const existingPayment = await tx.tradingPayment.findFirst({
        where: { tradingUserPlanId: tradingPlan.id, status: 'pending' },
        orderBy: { createdAt: 'desc' },
      })

      await (existingPayment
        ? await tx.tradingPayment.update({
            where: { id: existingPayment.id },
            data: {
              amountUsd: tradingPlan.investmentUsd,
              walletAddress: 'Account Balance',
              cryptoType: selectedCoin,
              transactionId: 'Account Balance - Pending Admin Approval',
              paymentProofUrl: null,
              status: 'pending',
              confirmations: 0,
              confirmedByAdminId: null,
              confirmedAt: null,
            },
          })
        : await tx.tradingPayment.create({
            data: {
              userId: tradingPlan.userId,
              tradingUserPlanId: tradingPlan.id,
              amountUsd: tradingPlan.investmentUsd,
              cryptoType: selectedCoin,
              walletAddress: 'Account Balance',
              transactionId: 'Account Balance - Pending Admin Approval',
              status: 'pending',
              confirmations: 0,
              confirmedAt: null,
            },
          }))
    })

    await logUserActivity({
      userId: user.id,
      action: 'AccountBalanceTradingPurchaseSubmitted',
      detail: `Submitted ${tradingPlan.plan.name} for admin approval using account balance.`,
    })

    return NextResponse.json({
      success: true,
      message: 'Account-balance payment submitted. Awaiting admin approval.',
    })
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Pay trading plan from account balance error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
