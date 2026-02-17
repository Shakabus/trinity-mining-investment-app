import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { pickTradingPlanReturn } from '@/lib/trading'
import { logUserActivity } from '@/lib/user-activity'
import { reconcileRejectedTradingPendingPlans } from '@/lib/trading-plan-reconciliation'
import {
  isInputValidationError,
  readJsonObject,
  readNumberField,
} from '@/lib/requestValidation'

const DEFAULT_CRYPTO = 'USDT'
const DEFAULT_WALLET = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
const TRADING_SELECT_ALLOWED_FIELDS = ['planId', 'investmentUsd'] as const

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await readJsonObject(req, { allowedKeys: TRADING_SELECT_ALLOWED_FIELDS })
    const planId = readNumberField(body, 'planId', { required: true, integer: true, min: 1 })!
    const investmentUsd = readNumberField(body, 'investmentUsd', { required: true, min: 0.01 })!

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    await reconcileRejectedTradingPendingPlans(user.id)

    const plan = await prisma.tradingPlan.findUnique({ where: { id: planId } })
    if (!plan) {
      return NextResponse.json({ error: 'Trading plan not found.' }, { status: 404 })
    }

    const existingPlan = await prisma.tradingUserPlan.findFirst({
      where: {
        userId: user.id,
        status: { in: ['active', 'awaiting_payment', 'selected'] },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (existingPlan?.status === 'awaiting_payment' || existingPlan?.status === 'selected') {
      return NextResponse.json({ error: 'You already have a pending trading payment.' }, { status: 409 })
    }

    if (existingPlan?.status === 'active') {
      return NextResponse.json({ error: 'You already have an active trading plan.' }, { status: 409 })
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

    const tradingUserPlan = await prisma.tradingUserPlan.create({
      data: {
        userId: user.id,
        planId: plan.id,
        investmentUsd,
        expectedReturnUsd: expected.expectedReturnUsd,
        durationHours: expected.durationHours,
        status: 'selected',
        paymentStatus: 'pending',
      },
    })

    await logUserActivity({
      userId: user.id,
      action: 'TradingPlanSelected',
      detail: `Trading plan ${plan.name} selected for $${investmentUsd.toLocaleString()}.`,
    })

    return NextResponse.json({ success: true, tradingUserPlanId: tradingUserPlan.id })
  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Trading plan selection error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
