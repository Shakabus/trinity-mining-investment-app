import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { logUserActivity } from '@/lib/user-activity'

const ALLOWED_STATUSES = ['pending', 'approved', 'processed', 'rejected']

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
    const id = Number(body?.id)
    const status = typeof body?.status === 'string' ? body.status : null
    const transactionId = typeof body?.transactionId === 'string' ? body.transactionId.trim() : ''

    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid withdrawal id.' }, { status: 400 })
    }

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
    }

    const updated = await prisma.referralWithdrawal.update({
      where: { id },
      data: {
        status,
        transactionId: transactionId || null,
        processedAt: status === 'processed' ? new Date() : null,
        processedByAdminId: status === 'processed' ? adminUser.id : null,
      },
    })

    await prisma.adminActivityLog.create({
      data: {
        actorAdminId: adminUser.id,
        targetUserId: updated.userId,
        action: 'ReferralWithdrawalUpdated',
        detail: `Referral withdrawal #${updated.id} set to ${status}.`,
      },
    })

    await logUserActivity({
      userId: updated.userId,
      action: 'ReferralWithdrawalUpdated',
      detail: `Referral withdrawal ${updated.id} marked as ${status}.`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update referral withdrawal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
