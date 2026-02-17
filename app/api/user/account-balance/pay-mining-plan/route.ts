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

const PAY_MINING_PLAN_FIELDS = ['userPlanId', 'coinType'] as const
const PAYABLE_COINS = ['BTC', 'ETH', 'SOL', 'USDT'] as const
const COIN_EPSILON = 0.00000001

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

    const body = await readJsonObject(req, { allowedKeys: PAY_MINING_PLAN_FIELDS })
    const userPlanId = readNumberField(body, 'userPlanId', { required: true, integer: true, min: 1 })!
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

    const cryptoPrices = await getTrackedCryptoPricesUsd()
    const finalPriceUsd = Number(userPlan.finalPrice)
    const debitReference = `mining-plan:${userPlan.id}`

    await prisma.$transaction(async tx => {
      await lockUserBalanceForUpdate(user.id, tx)

      const currentBalance = await getAccountBalanceSummary(user.id, tx)
      if (currentBalance.availableToSpendUsd < finalPriceUsd) {
        throw new HttpError(
          400,
          `Insufficient account balance. Available: $${currentBalance.availableToSpendUsd.toFixed(2)}.`
        )
      }

      const coinAvailability = await getAccountBalanceCoinAvailability(user.id, cryptoPrices, tx)
      const contributions = resolveCoinContributions({
        amountUsd: finalPriceUsd,
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
        if (entry.source !== 'mining_plan_purchase' || entry.direction !== 'debit') continue
        if (Number(entry.metadata?.userPlanId) !== userPlan.id) continue
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
        throw new HttpError(409, 'This plan has already been funded from account balance.')
      }

      for (let index = 0; index < contributions.length; index += 1) {
        const contribution = contributions[index]
        await createAccountBalanceEntry(
          {
            userId: user.id,
            direction: 'debit',
            status: 'pending',
            amountUsd: contribution.amountUsd,
            source: 'mining_plan_purchase',
            referenceId: `${debitReference}:${contribution.coinType}:${index + 1}`,
            note: `Account-balance payment submitted for ${userPlan.plan.name}.`,
            metadata: {
              userPlanId: userPlan.id,
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

      await tx.userPlan.update({
        where: { id: userPlan.id },
        data: {
          status: 'awaiting_payment',
          paymentStatus: 'pending',
          startDate: null,
          endDate: null,
        },
      })

      const existingPayment = await tx.payment.findFirst({
        where: { userPlanId: userPlan.id, status: 'pending' },
        orderBy: { createdAt: 'desc' },
      })

      await (existingPayment
        ? await tx.payment.update({
            where: { id: existingPayment.id },
            data: {
              amountUsd: userPlan.finalPrice,
              amountCrypto: contributions.length > 1 ? null : contributions[0].amountCrypto,
              cryptoType: contributions.length > 1 ? 'MIXED' : contributions[0].coinType,
              walletAddress: 'Account Balance',
              transactionId: 'Account Balance - Pending Review',
              paymentProofUrl: null,
              status: 'pending',
              confirmations: 0,
              confirmedByAdminId: null,
              confirmedAt: null,
            },
          })
        : await tx.payment.create({
            data: {
              userId: userPlan.userId,
              userPlanId: userPlan.id,
              amountUsd: userPlan.finalPrice,
              amountCrypto: contributions.length > 1 ? null : contributions[0].amountCrypto,
              cryptoType: contributions.length > 1 ? 'MIXED' : contributions[0].coinType,
              walletAddress: 'Account Balance',
              transactionId: 'Account Balance - Pending Review',
              status: 'pending',
              confirmations: 0,
              confirmedAt: null,
            },
          }))
    })

    await logUserActivity({
      userId: user.id,
      action: 'AccountBalancePlanPurchaseSubmitted',
      detail: `Submitted ${userPlan.plan.name} from account balance for review.`,
    })

    return NextResponse.json({
      success: true,
      message: 'Account-balance payment submitted. Awaiting review.',
    })
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Pay mining plan from account balance error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
