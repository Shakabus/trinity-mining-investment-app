import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { logUserActivity } from '@/lib/user-activity'
import {
  isInputValidationError,
  readJsonObject,
  readNumberField,
  readStringField,
} from '@/lib/requestValidation'

const ALLOWED_STATUSES = ['pending', 'approved', 'processed', 'rejected']
const ADMIN_REFERRAL_WITHDRAWAL_FIELDS = ['id', 'status', 'transactionId'] as const

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

    const body = await readJsonObject(req, { allowedKeys: ADMIN_REFERRAL_WITHDRAWAL_FIELDS })
    const id = readNumberField(body, 'id', { required: true, integer: true, min: 1 })!
    const status = readStringField(body, 'status', {
      required: true,
      enumValues: ALLOWED_STATUSES,
    })!
    const transactionId = readStringField(body, 'transactionId', { maxLength: 120 }) || ''

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
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Update referral withdrawal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
