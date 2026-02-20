import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { autoUpdateEarnings } from '@/lib/earnings'
import { convertUsdToCoin, getTrackedCryptoPricesUsd } from '@/lib/crypto-prices'
import { logUserActivity } from '@/lib/user-activity'
import {
  isInputValidationError,
  readJsonObject,
  readNumberField,
  readStringField,
} from '@/lib/requestValidation'

const SUPPORTED_COINS = ['BTC', 'ETH', 'USDT', 'SOL'] as const
const WITHDRAWAL_ALLOWED_FIELDS = ['coinType', 'amountUsd'] as const

export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await readJsonObject(req, { allowedKeys: WITHDRAWAL_ALLOWED_FIELDS })
    const coinType = readStringField(body, 'coinType', {
      required: true,
      toUpperCase: true,
      enumValues: SUPPORTED_COINS,
    }) as (typeof SUPPORTED_COINS)[number]
    const amountUsd = readNumberField(body, 'amountUsd', { required: true, min: 0.01 })!

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      include: {
        earnings: {
          where: { isActive: true },
          include: {
            userPlan: {
              include: {
                plan: true,
                multiAssetAllocations: true,
              },
            },
          },
        },
        miningStats: {
          orderBy: { createdAt: 'desc' },
        },
        withdrawals: {
          orderBy: { requestedAt: 'desc' },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const activeMining = user.miningStats.find(stat => stat.isActive) ?? user.miningStats[0] ?? null
    const now = new Date()
    const updatedEarnings = await autoUpdateEarnings({
      userId: user.id,
      earnings: user.earnings,
      miningStats: activeMining
        ? {
            assignedHashrate: activeMining.assignedHashrate,
            hashrateUnit: activeMining.hashrateUnit,
            isActive: activeMining.isActive,
          }
        : null,
      now,
    })

    const withdrawableUsd = updatedEarnings
      .filter(record => record.isWithdrawable)
      .reduce((sum, record) => sum + Number(record.totalEarnedUsd), 0)

    const committedUsd = user.withdrawals
      .filter(item => item.status !== 'rejected')
      .reduce((sum, item) => sum + Number(item.amountUsd), 0)

    const availableUsd = Math.max(0, withdrawableUsd - committedUsd)

    const activePlan = updatedEarnings.find(record => record.userPlan.status === 'active')?.userPlan
    const dailyActiveUsd = updatedEarnings
      .filter(record => record.userPlan.status === 'active' && !record.isHistorical)
      .reduce((sum, record) => sum + Number(record.dailyEstimateUsd), 0)
    const estimatedTotalUsd =
      activePlan && dailyActiveUsd > 0
        ? dailyActiveUsd * (activePlan.selectedDurationDays ?? 0)
        : 0
    const baseMinWithdrawalUsd = estimatedTotalUsd > 0 && estimatedTotalUsd < 100 ? estimatedTotalUsd : 100
    const minWithdrawalUsd =
      availableUsd > 0 ? Math.max(1, Math.min(baseMinWithdrawalUsd, availableUsd)) : baseMinWithdrawalUsd

    if (amountUsd < minWithdrawalUsd) {
      return NextResponse.json(
        { error: `Minimum withdrawal is $${minWithdrawalUsd.toFixed(2)}.` },
        { status: 400 }
      )
    }

    if (amountUsd > availableUsd) {
      return NextResponse.json({ error: 'Amount exceeds withdrawable balance.' }, { status: 400 })
    }

    const prices = await getTrackedCryptoPricesUsd()
    const price = prices[coinType]
    if (!price || !Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: 'Unable to fetch coin price.' }, { status: 400 })
    }
    const amountCrypto = convertUsdToCoin(amountUsd, coinType, prices)

    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId: user.id,
        coinType,
        amountUsd,
        amountCrypto,
        walletAddress: 'Account Balance',
        status: 'pending',
      },
    })

    await logUserActivity({
      userId: user.id,
      action: 'WithdrawalToAccountBalanceRequested',
      detail: `Requested $${amountUsd.toFixed(2)} mining transfer to account balance (${coinType}).`,
    })

    return NextResponse.json({ success: true, withdrawalId: withdrawal.id })
  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Withdrawal request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
