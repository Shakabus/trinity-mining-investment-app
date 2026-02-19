import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import {
  AccountFreezeError,
  applyOutgoingCoinFreezesToAvailability,
  assertMetricAllowed,
  assertOutgoingAllowed,
  getAccountFreezeSettings,
  logAccountFreezeTableMissing,
} from '@/lib/account-freeze'
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
const COIN_EPSILON = 0.00000001
type UnsafeTx = Prisma.TransactionClient & Record<string, any>

class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type CoinContribution = {
  coinType: TrackedAssetCoin
  amountUsd: number
  amountCrypto: number
  usdPrice: number
}

const resolveCoinContributions = ({
  amountUsd,
  requestedCoin,
  availability,
  prices,
}: {
  amountUsd: number
  requestedCoin: TrackedAssetCoin | null
  availability: Awaited<ReturnType<typeof getAccountBalanceCoinAvailability>>
  prices: Awaited<ReturnType<typeof getTrackedCryptoPricesUsd>>
}): CoinContribution[] => {
  let remainingCents = Math.round(amountUsd * 100)
  if (remainingCents <= 0) return []

  const allCoins = [...TRACKED_ASSET_COINS]
  const rankedCoins = allCoins.sort(
    (a, b) => (availability.byCoin[b]?.availableUsd ?? 0) - (availability.byCoin[a]?.availableUsd ?? 0)
  )
  const coins: TrackedAssetCoin[] = requestedCoin
    ? [requestedCoin, ...rankedCoins.filter(coin => coin !== requestedCoin)]
    : rankedCoins

  const contributions: CoinContribution[] = []

  for (const coinType of coins) {
    if (remainingCents <= 0) break

    const availableUsd = Math.max(0, availability.byCoin[coinType]?.availableUsd ?? 0)
    const availableCrypto = Math.max(0, availability.byCoin[coinType]?.availableCrypto ?? 0)
    const usdPrice = prices[coinType]
    if (availableUsd <= 0 || availableCrypto <= 0 || usdPrice <= 0) continue

    let takeCents = Math.min(remainingCents, Math.floor(availableUsd * 100))
    while (takeCents > 0) {
      const amountUsdPart = Number((takeCents / 100).toFixed(2))
      const amountCryptoPart = convertUsdToCoin(amountUsdPart, coinType, prices)
      if (amountCryptoPart > 0 && amountCryptoPart <= availableCrypto + COIN_EPSILON) {
        contributions.push({
          coinType,
          amountUsd: amountUsdPart,
          amountCrypto: amountCryptoPart,
          usdPrice,
        })
        remainingCents -= takeCents
        break
      }
      takeCents -= 1
    }
  }

  if (remainingCents > 0) {
    return []
  }

  return contributions
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

    await prisma.$transaction(
      async (tx: UnsafeTx) => {
        await lockUserBalanceForUpdate(user.id, tx)

      const summary = await getAccountBalanceSummary(user.id, tx)
      if (summary.availableToSpendUsd < investmentUsd) {
        throw new HttpError(
          400,
          `Insufficient account balance. Available: $${summary.availableToSpendUsd.toFixed(2)}.`
        )
      }

      const freezeQuery = await getAccountFreezeSettings(user.id, tx)
      if (freezeQuery.tableMissing) {
        logAccountFreezeTableMissing('api/user/account-balance/pay-trading-plan:POST')
      } else {
        assertMetricAllowed({
          settings: freezeQuery.settings,
          metric: 'spendable',
          context: 'trading plan payment',
        })
        assertMetricAllowed({
          settings: freezeQuery.settings,
          metric: 'wallets',
          context: 'trading plan payment',
        })
        assertOutgoingAllowed({
          settings: freezeQuery.settings,
          amountUsd: investmentUsd,
          availableUsd: summary.availableToSpendUsd,
          context: 'trading plan payment',
        })
      }

      const rawCoinAvailability = await getAccountBalanceCoinAvailability(user.id, cryptoPrices, tx)
      const coinAvailability = freezeQuery.tableMissing
        ? rawCoinAvailability
        : applyOutgoingCoinFreezesToAvailability(rawCoinAvailability, freezeQuery.settings, cryptoPrices)
      const contributions = resolveCoinContributions({
        amountUsd: investmentUsd,
        requestedCoin,
        availability: coinAvailability,
        prices: cryptoPrices,
      })

      if (!contributions.length) {
        throw new HttpError(400, 'Insufficient wallet funds across all supported coins for this purchase.')
      }

      const existingEntries = await getAccountBalanceEntries(user.id, { limit: 3000 }, tx)
      const latestByReference = new Map<string, (typeof existingEntries)[number]>()
      for (const entry of existingEntries) {
        if (entry.source !== 'trading_plan_purchase' || entry.direction !== 'debit') continue
        if (Number(entry.metadata?.tradingUserPlanId) !== tradingPlan.id) continue
        const current = latestByReference.get(entry.referenceId)
        if (!current || current.createdAt.getTime() < entry.createdAt.getTime()) {
          latestByReference.set(entry.referenceId, entry)
        }
      }
      const latestPlanEntries = [...latestByReference.values()]

      if (latestPlanEntries.some(entry => entry.status === 'pending')) {
        throw new HttpError(409, 'This account-balance payment is already pending review.')
      }

      if (latestPlanEntries.some(entry => entry.status === 'settled')) {
        throw new HttpError(409, 'This trading plan has already been funded from account balance.')
      }

      for (let index = 0; index < contributions.length; index += 1) {
        const contribution = contributions[index]
        await createAccountBalanceEntry(
          {
            userId: user.id,
            direction: 'debit',
            status: 'pending',
            amountUsd: contribution.amountUsd,
            source: 'trading_plan_purchase',
            referenceId: `${debitReference}:${contribution.coinType}:${index + 1}`,
            note: `Account-balance payment submitted for ${tradingPlan.plan.name}.`,
            metadata: {
              tradingUserPlanId: tradingPlan.id,
              planReference: debitReference,
              segmentIndex: index + 1,
              segmentCount: contributions.length,
              coinType: contribution.coinType,
              amountCrypto: contribution.amountCrypto,
              usdPriceAtRequest: contribution.usdPrice,
            },
          },
          tx
        )
      }

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
                cryptoType: contributions.length > 1 ? 'MIXED' : contributions[0].coinType,
                transactionId: 'Account Balance - Pending Review',
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
                cryptoType: contributions.length > 1 ? 'MIXED' : contributions[0].coinType,
                walletAddress: 'Account Balance',
                transactionId: 'Account Balance - Pending Review',
                status: 'pending',
                confirmations: 0,
                confirmedAt: null,
              },
            }))
      },
      { maxWait: 5_000, timeout: 20_000 }
    )

    await logUserActivity({
      userId: user.id,
      action: 'AccountBalanceTradingPurchaseSubmitted',
      detail: `Submitted ${tradingPlan.plan.name} from account balance for review.`,
    })

    return NextResponse.json({
      success: true,
      message: 'Account-balance payment submitted. Awaiting review.',
    })
  } catch (error) {
    if (error instanceof AccountFreezeError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Pay trading plan from account balance error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
