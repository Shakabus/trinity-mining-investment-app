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

    const { tradingUserPlanId, txid } = await req.json()

    const tradingPlan = await prisma.tradingUserPlan.findUnique({
      where: { id: tradingUserPlanId },
      include: { user: true, plan: true },
    })

    if (!tradingPlan) {
      return NextResponse.json({ error: 'Trading plan not found' }, { status: 404 })
    }

    if (tradingPlan.status !== 'awaiting_payment' || tradingPlan.paymentStatus !== 'pending') {
      return NextResponse.json({ error: 'Payment already processed for this plan.' }, { status: 409 })
    }

    if (txid) {
      const isHex64 = /^[a-fA-F0-9]{64}$/.test(txid)
      const isEthTx = /^0x[a-fA-F0-9]{64}$/.test(txid)
      if (!(isHex64 || isEthTx)) {
        return NextResponse.json({ error: 'TXID format looks invalid.' }, { status: 400 })
      }
    }

    const startDate = new Date()
    const endDate = new Date(startDate.getTime() + tradingPlan.durationHours * 60 * 60 * 1000)

    await prisma.tradingUserPlan.update({
      where: { id: tradingPlan.id },
      data: {
        status: 'active',
        paymentStatus: 'confirmed',
        startDate,
        endDate,
      },
    })

    await prisma.user.update({
      where: { id: tradingPlan.userId },
      data: { accountStatus: 'active' },
    })

    const existingStats = await prisma.tradingStat.findFirst({
      where: { tradingUserPlanId: tradingPlan.id },
    })

    if (!existingStats) {
      await prisma.tradingStat.create({
        data: {
          userId: tradingPlan.userId,
          tradingUserPlanId: tradingPlan.id,
          isActive: true,
          botSpeed: 1.0,
          strategy: 'Portfolio Balance',
          riskLevel: 'balanced',
        },
      })
    }

    const existingEarnings = await prisma.tradingEarning.findFirst({
      where: { tradingUserPlanId: tradingPlan.id },
    })

    if (!existingEarnings) {
      await prisma.tradingEarning.create({
        data: {
          userId: tradingPlan.userId,
          tradingUserPlanId: tradingPlan.id,
          totalEarnedUsd: 0,
          dailyEstimateUsd: Number(tradingPlan.expectedReturnUsd) / (tradingPlan.durationHours / 24),
          isActive: true,
        },
      })
    }

    const existingPayment = await prisma.tradingPayment.findFirst({
      where: {
        tradingUserPlanId: tradingPlan.id,
        status: 'pending',
      },
      orderBy: { createdAt: 'desc' },
    })

    if (existingPayment) {
      await prisma.tradingPayment.update({
        where: { id: existingPayment.id },
        data: {
          transactionId: txid || existingPayment.transactionId || 'Manual Approval',
          status: 'confirmed',
          confirmations: 999,
          confirmedByAdminId: adminUser.id,
          confirmedAt: new Date(),
        },
      })
    }

    await logUserActivity({
      userId: tradingPlan.userId,
      action: 'TradingPaymentApproved',
      detail: `Payment approved for ${tradingPlan.plan.name}.`,
    })

    await prisma.adminActivityLog.create({
      data: {
        actorAdminId: adminUser.id,
        targetUserId: tradingPlan.userId,
        action: 'approveTradingPayment',
        detail: `Trading payment approved for ${tradingPlan.plan.name}.`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error approving trading payment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
