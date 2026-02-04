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

    // Check if user is admin
    const adminUser = await prisma.user.findUnique({
      where: { clerkUserId: userId }
    })

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userPlanId } = await req.json()

    // Get the user plan
    const userPlan = await prisma.userPlan.findUnique({
      where: { id: userPlanId }
    })

    if (!userPlan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    if (userPlan.status !== 'awaiting_payment' || userPlan.paymentStatus !== 'pending') {
      return NextResponse.json({ error: 'Payment already processed for this plan.' }, { status: 409 })
    }

    // Delete the user plan (this cancels the selection)
    await prisma.userPlan.delete({
      where: { id: userPlanId }
    })

    const hasActiveMining = await prisma.userPlan.count({
      where: { userId: userPlan.userId, status: 'active' },
    })
    const hasActiveTrading = await prisma.tradingUserPlan.count({
      where: { userId: userPlan.userId, status: 'active' },
    })

    await prisma.user.update({
      where: { id: userPlan.userId },
      data: { accountStatus: hasActiveMining > 0 || hasActiveTrading > 0 ? 'active' : 'inactive' },
    })

    await logUserActivity({
      userId: userPlan.userId,
      action: 'PaymentRejected',
      detail: 'Payment was rejected.',
    })

    return NextResponse.json({ 
      success: true,
      message: 'Payment rejected and plan cancelled'
    })

  } catch (error) {
    console.error('Error rejecting payment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
