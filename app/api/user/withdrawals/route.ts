import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { autoUpdateEarnings } from '@/lib/earnings'
import { getCryptoPricesUsd } from '@/lib/earnings'
import { logUserActivity } from '@/lib/user-activity'

const SUPPORTED_COINS = ['BTC', 'ETH', 'LTC'] as const

export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const coinType = body?.coinType as (typeof SUPPORTED_COINS)[number]
    const amountUsd = Number(body?.amountUsd)

    if (!SUPPORTED_COINS.includes(coinType)) {
      return NextResponse.json({ error: 'Unsupported coin.' }, { status: 400 })
    }

    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      return NextResponse.json({ error: 'Invalid withdrawal amount.' }, { status: 400 })
    }

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

    const reservedUsd = user.withdrawals
      .filter(item => item.status !== 'rejected')
      .reduce((sum, item) => sum + Number(item.amountUsd), 0)

    const availableUsd = Math.max(0, withdrawableUsd - reservedUsd)

    const activePlan = updatedEarnings.find(record => record.userPlan.status === 'active')?.userPlan
    const dailyActiveUsd = updatedEarnings
      .filter(record => record.userPlan.status === 'active' && !record.isHistorical)
      .reduce((sum, record) => sum + Number(record.dailyEstimateUsd), 0)
    const estimatedTotalUsd =
      activePlan && dailyActiveUsd > 0 ? dailyActiveUsd * activePlan.selectedDurationDays : 0
    const minWithdrawalUsd = estimatedTotalUsd > 0 && estimatedTotalUsd < 100 ? estimatedTotalUsd : 100

    if (amountUsd < minWithdrawalUsd) {
      return NextResponse.json(
        { error: `Minimum withdrawal is $${minWithdrawalUsd.toFixed(2)}.` },
        { status: 400 }
      )
    }

    if (amountUsd > availableUsd) {
      return NextResponse.json({ error: 'Amount exceeds withdrawable balance.' }, { status: 400 })
    }

    const walletAddress =
      coinType === 'BTC'
        ? user.btcWalletAddress || user.walletAddress
        : coinType === 'ETH'
        ? user.ethWalletAddress
        : user.ltcWalletAddress

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address not found.' }, { status: 400 })
    }

    const prices = await getCryptoPricesUsd()
    const price = prices[coinType] || 0
    if (!price) {
      return NextResponse.json({ error: 'Unable to fetch coin price.' }, { status: 400 })
    }
    const amountCrypto = amountUsd / price

    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId: user.id,
        coinType,
        amountUsd,
        amountCrypto,
        walletAddress,
        status: 'pending',
      },
    })

    await logUserActivity({
      userId: user.id,
      action: 'WithdrawalRequested',
      detail: `Requested $${amountUsd.toFixed(2)} withdrawal in ${coinType}.`,
    })

    return NextResponse.json({ success: true, withdrawalId: withdrawal.id })
  } catch (error) {
    console.error('Withdrawal request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
