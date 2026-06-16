import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logUserActivity } from '@/lib/user-activity'
import { isInputValidationError, readJsonObject, readStringField } from '@/lib/requestValidation'
import { isMissingKycTableError, logKycTableMissing } from '@/lib/kyc-db'

const KYC_REVIEW_FIELDS = ['decision', 'note'] as const

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUser = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { id: true, role: true },
    })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await context.params
    const kycId = Number(id)
    if (!Number.isInteger(kycId) || kycId <= 0) {
      return NextResponse.json({ error: 'Invalid KYC id.' }, { status: 400 })
    }

    const body = await readJsonObject(req, { allowedKeys: KYC_REVIEW_FIELDS })
    const decision = readStringField(body, 'decision', {
      required: true,
      enumValues: ['approve', 'reject'],
    }) as 'approve' | 'reject'
    const note = readStringField(body, 'note', { maxLength: 500 }) || null

    const existing = await prisma.userKyc.findUnique({
      where: { id: kycId },
      select: { id: true, userId: true, status: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'KYC record not found.' }, { status: 404 })
    }
    if (existing.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending KYC records can be reviewed.' }, { status: 409 })
    }

    const status = decision === 'approve' ? 'approved' : 'rejected'
    await prisma.userKyc.update({
      where: { id: kycId },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedByAdminId: adminUser.id,
        reviewNote: note,
      },
    })

    await prisma.adminActivityLog.create({
      data: {
        actorAdminId: adminUser.id,
        targetUserId: existing.userId,
        action: 'reviewKyc',
        detail: `KYC ${kycId} marked ${status}.`,
      },
    })

    await logUserActivity({
      userId: existing.userId,
      action: decision === 'approve' ? 'KYCApproved' : 'KYCRejected',
      detail:
        decision === 'approve'
          ? 'KYC verification approved.'
          : `KYC verification rejected.${note ? ` ${note}` : ''}`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (isMissingKycTableError(error)) {
      logKycTableMissing('api/admin/kyc/[id]:PATCH')
      return NextResponse.json(
        { error: 'KYC service is unavailable. Apply database migration and retry.' },
        { status: 503 }
      )
    }
    console.error('Review KYC error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
