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

const ADMIN_TRADING_WITHDRAWAL_FIELDS = ['withdrawalId', 'status', 'transactionId'] as const
const ALLOWED_STATUSES = ['pending', 'approved', 'processed', 'rejected'] as const

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

    const body = await readJsonObject(req, { allowedKeys: ADMIN_TRADING_WITHDRAWAL_FIELDS })
    const withdrawalId = readNumberField(body, 'withdrawalId', {
      required: true,
      integer: true,
      min: 1,
    })!
    const status = readStringField(body, 'status', {
      required: true,
      enumValues: ALLOWED_STATUSES,
    })!
    const transactionId = readStringField(body, 'transactionId', { maxLength: 120 })

    const updateData: {
      status: string
      transactionId?: string | null
      processedAt?: Date | null
      processedByAdminId?: number | null
    } = {
      status,
      transactionId: transactionId || null,
    }

    if (status === 'processed') {
      updateData.processedAt = new Date()
      updateData.processedByAdminId = adminUser.id
    }

    const withdrawal = await prisma.tradingWithdrawal.update({
      where: { id: withdrawalId },
      data: updateData,
    })

    await prisma.adminActivityLog.create({
      data: {
        actorAdminId: adminUser.id,
        targetUserId: withdrawal.userId,
        action: 'updateTradingWithdrawal',
        detail: `Trading withdrawal ${withdrawalId} set to ${status}.`,
      },
    })

    await logUserActivity({
      userId: withdrawal.userId,
      action: 'TradingWithdrawalUpdated',
      detail: `Trading withdrawal ${withdrawalId} marked as ${status}.`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Update trading withdrawal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
