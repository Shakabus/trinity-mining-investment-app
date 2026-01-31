import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { logUserActivity } from '@/lib/user-activity'

export async function PATCH(req: Request) {
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

    const body = await req.json()
    const withdrawalId = Number(body.withdrawalId)
    const status = body.status as string

    if (!withdrawalId || Number.isNaN(withdrawalId)) {
      return NextResponse.json({ error: 'Invalid withdrawal id' }, { status: 400 })
    }

    const allowedStatuses = ['pending', 'approved', 'processed', 'rejected']
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const updateData: {
      status: string
      transactionId?: string | null
      processedAt?: Date | null
      processedByAdminId?: number | null
    } = {
      status,
      transactionId: body.transactionId ?? null,
    }

    if (status === 'processed') {
      updateData.processedAt = new Date()
      updateData.processedByAdminId = adminUser.id
    }

    const withdrawal = await prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: updateData,
    })

    await prisma.adminActivityLog.create({
      data: {
        actorAdminId: adminUser.id,
        targetUserId: withdrawal.userId,
        action: 'updateWithdrawal',
        detail: `Withdrawal ${withdrawalId} set to ${status}.`,
      },
    })

    await logUserActivity({
      userId: withdrawal.userId,
      action: 'WithdrawalUpdated',
      detail: `Withdrawal ${withdrawalId} marked as ${status}.`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update withdrawal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
