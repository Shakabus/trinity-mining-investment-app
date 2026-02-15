import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { logUserActivity } from '@/lib/user-activity'
import {
  isInputValidationError,
  readJsonObject,
  readNumberField,
} from '@/lib/requestValidation'

const UPGRADE_PLAN_ALLOWED_FIELDS = ['planId', 'durationDays', 'finalPrice'] as const

function getRemainingDays(startDate: Date | null, endDate: Date | null, totalDays: number) {
  if (endDate) {
    return Math.max(
      0,
      Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    )
  }
  if (startDate) {
    const elapsed = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, totalDays - elapsed)
  }
  return totalDays
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await readJsonObject(req, { allowedKeys: UPGRADE_PLAN_ALLOWED_FIELDS })
    const planId = readNumberField(body, 'planId', { required: true, integer: true, min: 1 })!
    const durationDays = readNumberField(body, 'durationDays', { required: true, integer: true, min: 1 })!

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      include: {
        userPlans: {
          where: { status: 'active' },
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const currentPlan = user.userPlans[0]
    if (!currentPlan) {
      return NextResponse.json({ error: 'No active plan to upgrade' }, { status: 400 })
    }

    const existingUpgrade = await prisma.userPlan.findFirst({
      where: {
        userId: user.id,
        status: 'awaiting_payment',
        upgradeFromPlanId: { not: null },
      },
    })

    if (existingUpgrade) {
      return NextResponse.json({ error: 'Upgrade already pending payment.' }, { status: 400 })
    }

    const existingPendingPlan = await prisma.userPlan.findFirst({
      where: {
        userId: user.id,
        status: 'awaiting_payment',
      },
    })

    if (existingPendingPlan) {
      return NextResponse.json({ error: 'You already have a pending plan selection.' }, { status: 409 })
    }

    const targetPlan = await prisma.plan.findUnique({
      where: { id: planId },
      include: {
        durationOptions: true,
      },
    })

    if (!targetPlan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    const durationOption = targetPlan.durationOptions.find(opt => opt.durationDays === durationDays)
    if (!durationOption) {
      return NextResponse.json({ error: 'Invalid duration selection' }, { status: 400 })
    }

    const basePrice = Number(targetPlan.basePrice)
    const finalPrice = basePrice * Number(durationOption.priceMultiplier)

    let upgradeCredit = 0
    let upgradePrice = finalPrice

    if (targetPlan.id === currentPlan.planId) {
      if (durationDays <= currentPlan.selectedDurationDays) {
        return NextResponse.json({ error: 'Please select a longer duration to extend this plan.' }, { status: 400 })
      }
      const remainingDays = getRemainingDays(currentPlan.startDate, currentPlan.endDate, currentPlan.selectedDurationDays)
      const creditRatio = currentPlan.selectedDurationDays > 0 ? remainingDays / currentPlan.selectedDurationDays : 0
      upgradeCredit = Number(currentPlan.finalPrice) * creditRatio
      upgradePrice = finalPrice - upgradeCredit
      if (upgradePrice <= 0) {
        return NextResponse.json({ error: 'Upgrade credit exceeds the upgrade price.' }, { status: 400 })
      }
    } else {
      if (Number(targetPlan.basePrice) <= Number(currentPlan.plan.basePrice)) {
        return NextResponse.json({ error: 'Only higher-tier plans are eligible for upgrade.' }, { status: 400 })
      }

      const remainingDays = getRemainingDays(currentPlan.startDate, currentPlan.endDate, currentPlan.selectedDurationDays)
      const creditRatio = currentPlan.selectedDurationDays > 0 ? remainingDays / currentPlan.selectedDurationDays : 0
      upgradeCredit = Number(currentPlan.finalPrice) * creditRatio
      upgradePrice = finalPrice - upgradeCredit

      if (upgradePrice <= 0) {
        return NextResponse.json({ error: 'Upgrade credit exceeds the upgrade price.' }, { status: 400 })
      }
    }

    const userPlan = await prisma.userPlan.create({
      data: {
        userId: user.id,
        planId: targetPlan.id,
        selectedDurationDays: durationDays,
        finalPrice: upgradePrice,
        status: 'awaiting_payment',
        paymentStatus: 'pending',
        upgradeFromPlanId: currentPlan.id,
        upgradeCredit: upgradeCredit,
      },
    })

    await logUserActivity({
      userId: user.id,
      action: 'PlanUpgradeRequested',
      detail: `Requested upgrade to ${targetPlan.name} for ${durationDays} days. Credit applied: $${upgradeCredit.toFixed(
        2
      )}.`,
    })

    return NextResponse.json({
      success: true,
      userPlanId: userPlan.id,
    })
  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error upgrading plan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
