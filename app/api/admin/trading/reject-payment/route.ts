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

    const adminUser = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    })

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { tradingUserPlanId } = await req.json()

    const tradingPlan = await prisma.tradingUserPlan.findUnique({
      where: { id: tradingUserPlanId },
    })

    if (!tradingPlan) {
      return NextResponse.json({ error: 'Trading plan not found' }, { status: 404 })
    }

    if (tradingPlan.status !== 'awaiting_payment' || tradingPlan.paymentStatus !== 'pending') {
      return NextResponse.json({ error: 'Payment already processed for this plan.' }, { status: 409 })
    }

    await prisma.tradingUserPlan.delete({
      where: { id: tradingPlan.id },
    })

    await logUserActivity({
      userId: tradingPlan.userId,
      action: 'TradingPaymentRejected',
      detail: 'Trading payment was rejected.',
    })

    await prisma.adminActivityLog.create({
      data: {
        actorAdminId: adminUser.id,
        targetUserId: tradingPlan.userId,
        action: 'rejectTradingPayment',
        detail: 'Trading payment rejected.',
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error rejecting trading payment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
