import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { pickTradingPlanReturn } from '@/lib/trading'
import { logUserActivity } from '@/lib/user-activity'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const planId = Number(body.planId)
    const investmentUsd = Number(body.investmentUsd)

    if (!planId || Number.isNaN(planId)) {
      return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 })
    }

    if (!Number.isFinite(investmentUsd) || investmentUsd <= 0) {
      return NextResponse.json({ error: 'Invalid investment amount.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const plan = await prisma.tradingPlan.findUnique({ where: { id: planId } })
    if (!plan) {
      return NextResponse.json({ error: 'Trading plan not found.' }, { status: 404 })
    }

    const minInvestment = Number(plan.minInvestmentUsd)
    const maxInvestment = Number(plan.maxInvestmentUsd)

    if (investmentUsd < minInvestment || investmentUsd > maxInvestment) {
      return NextResponse.json({
        error: `Investment must be between $${minInvestment.toLocaleString()} and $${maxInvestment.toLocaleString()}.`,
      }, { status: 400 })
    }

    const selectionSeed = user.id * 19 + plan.id * 7 + Math.round(investmentUsd)
    const expected = pickTradingPlanReturn({
      id: plan.id,
      minInvestmentUsd: minInvestment,
      maxInvestmentUsd: maxInvestment,
      minDurationHours: plan.minDurationHours,
      maxDurationHours: plan.maxDurationHours,
      minReturnMultiplier: Number(plan.minReturnMultiplier),
      maxReturnMultiplier: Number(plan.maxReturnMultiplier),
    }, investmentUsd, selectionSeed)

    const startDate = new Date()
    const endDate = new Date(startDate.getTime() + expected.durationHours * 60 * 60 * 1000)

    const tradingUserPlan = await prisma.tradingUserPlan.create({
      data: {
        userId: user.id,
        planId: plan.id,
        investmentUsd,
        expectedReturnUsd: expected.expectedReturnUsd,
        durationHours: expected.durationHours,
        status: 'active',
        paymentStatus: 'confirmed',
        startDate,
        endDate,
      },
    })

    await prisma.tradingStat.create({
      data: {
        userId: user.id,
        tradingUserPlanId: tradingUserPlan.id,
        isActive: true,
        botSpeed: 1.0,
        strategy: 'Adaptive Momentum',
        riskLevel: 'balanced',
      },
    })

    await prisma.tradingEarning.create({
      data: {
        userId: user.id,
        tradingUserPlanId: tradingUserPlan.id,
        totalEarnedUsd: 0,
        dailyEstimateUsd: expected.expectedReturnUsd / (expected.durationHours / 24),
        isActive: true,
      },
    })

    await logUserActivity({
      userId: user.id,
      action: 'TradingPlanActivated',
      detail: `Trading plan ${plan.name} activated with $${investmentUsd.toLocaleString()}.`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Trading plan selection error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
