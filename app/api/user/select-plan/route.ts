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

    const { planId, durationDays, finalPrice } = await req.json()

    const selectedPlan = await prisma.plan.findUnique({
      where: { id: planId },
    })

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      include: {
        userPlans: {
          where: { status: { in: ['active', 'awaiting_payment'] } },
          take: 1,
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.userPlans.length > 0) {
      const existing = user.userPlans[0]
      if (existing.status === 'awaiting_payment') {
        return NextResponse.json({ error: 'You already have a pending plan selection.' }, { status: 409 })
      }
      return NextResponse.json({ error: 'You already have an active plan. Please use the upgrade flow.' }, { status: 400 })
    }

    // Create user plan
    const userPlan = await prisma.userPlan.create({
      data: {
        userId: user.id,
        planId: planId,
        selectedDurationDays: durationDays,
        finalPrice: finalPrice,
        status: 'awaiting_payment',
        paymentStatus: 'pending'
      }
    })

    // Update user account status to pending
    await prisma.user.update({
      where: { id: user.id },
      data: { accountStatus: 'pending' }
    })

    await logUserActivity({
      userId: user.id,
      action: 'PlanSelected',
      detail: selectedPlan
        ? `Selected ${selectedPlan.name} for ${durationDays} days.`
        : `Selected plan ${planId} for ${durationDays} days.`,
    })

    return NextResponse.json({ 
      success: true, 
      userPlanId: userPlan.id 
    })

  } catch (error) {
    console.error('Error selecting plan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
