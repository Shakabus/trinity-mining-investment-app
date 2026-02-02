import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { logUserActivity } from '@/lib/user-activity'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const amountUsd = Number(body.amountUsd)
    const walletAddress = String(body.walletAddress || '').trim()

    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      return NextResponse.json({ error: 'Invalid amount.' }, { status: 400 })
    }

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      include: {
        tradingEarnings: { orderBy: { createdAt: 'desc' } },
        tradingWithdrawals: true,
        tradingPlans: { orderBy: { createdAt: 'desc' } },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const activePlan = user.tradingPlans.find(plan => plan.status === 'active') ?? user.tradingPlans[0]
    if (!activePlan) {
      return NextResponse.json({ error: 'No active trading plan.' }, { status: 400 })
    }

    const activeEarning = user.tradingEarnings.find(earning => earning.isActive) ?? user.tradingEarnings[0]
    const totalEarned = activeEarning ? Number(activeEarning.totalEarnedUsd) : 0
    const totalWithdrawn = user.tradingWithdrawals.reduce((sum, w) => sum + Number(w.amountUsd), 0)
    const availableUsd = Math.max(0, totalEarned - totalWithdrawn)
    const minWithdrawalUsd = Math.min(100, Math.max(20, totalEarned * 0.05))

    if (amountUsd < minWithdrawalUsd) {
      return NextResponse.json({ error: `Minimum withdrawal is $${minWithdrawalUsd.toFixed(2)}.` }, { status: 400 })
    }

    if (amountUsd > availableUsd) {
      return NextResponse.json({ error: 'Amount exceeds available balance.' }, { status: 400 })
    }

    const withdrawal = await prisma.tradingWithdrawal.create({
      data: {
        userId: user.id,
        tradingUserPlanId: activePlan.id,
        amountUsd,
        walletAddress,
        status: 'pending',
      },
    })

    await logUserActivity({
      userId: user.id,
      action: 'TradingWithdrawalRequested',
      detail: `Trading withdrawal requested for $${amountUsd.toFixed(2)}.`,
    })

    return NextResponse.json({ success: true, withdrawalId: withdrawal.id })
  } catch (error) {
    console.error('Trading withdrawal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
