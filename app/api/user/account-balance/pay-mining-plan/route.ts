import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import {
  createAccountBalanceEntry,
  getAccountBalanceEntries,
  getAccountBalanceAssetSummary,
  getAccountBalanceSummary,
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

    const cryptoPrices = await getTrackedCryptoPricesUsd()
    const assetSummary = await getAccountBalanceAssetSummary(user.id, cryptoPrices)
    const selectedCoin =
      requestedCoin ??
      [...TRACKED_ASSET_COINS]
        .sort((a, b) => (assetSummary.byCoin[b]?.netUsd ?? 0) - (assetSummary.byCoin[a]?.netUsd ?? 0))
        .find(coin => (assetSummary.byCoin[coin]?.netUsd ?? 0) >= finalPriceUsd)

    if (!selectedCoin) {
      return NextResponse.json({ error: 'No funded wallet has enough balance for this purchase.' }, { status: 400 })
    }

    const requiredCoinAmount = convertUsdToCoin(finalPriceUsd, selectedCoin, cryptoPrices)
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

    const debitReference = `mining-plan:${userPlan.id}`
    const existingEntries = await getAccountBalanceEntries(user.id, { limit: 3000 })
    const latestPaymentEntry = existingEntries
      .filter(
        entry =>
          entry.referenceId === debitReference &&
          entry.source === 'mining_plan_purchase' &&
          entry.direction === 'debit'
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]

    if (latestPaymentEntry?.status === 'pending') {
      return NextResponse.json(
        { error: 'This account-balance payment is already pending admin approval.' },
        { status: 409 }
      )
    }

    if (latestPaymentEntry?.status === 'settled') {
      return NextResponse.json(
        { error: 'This plan has already been funded from account balance.' },
        { status: 409 }
      )
    }

    await prisma.$transaction(async tx => {
      await createAccountBalanceEntry(
        {
          userId: user.id,
          direction: 'debit',
          status: 'pending',
          amountUsd: finalPriceUsd,
          source: 'mining_plan_purchase',
          referenceId: debitReference,
          note: `Account-balance payment submitted for ${userPlan.plan.name}.`,
          metadata: {
            userPlanId: userPlan.id,
            coinType: selectedCoin,
            amountCrypto: requiredCoinAmount,
            usdPriceAtRequest: cryptoPrices[selectedCoin],
          },
        },
        tx
      )

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
              amountCrypto: requiredCoinAmount,
              cryptoType: selectedCoin,
              walletAddress: 'Account Balance',
              transactionId: 'Account Balance - Pending Admin Approval',
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
              amountCrypto: requiredCoinAmount,
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
      action: 'AccountBalancePlanPurchaseSubmitted',
      detail: `Submitted ${userPlan.plan.name} for admin approval using account balance.`,
    })

    return NextResponse.json({
      success: true,
      message: 'Account-balance payment submitted. Awaiting admin approval.',
    })
  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Pay mining plan from account balance error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
