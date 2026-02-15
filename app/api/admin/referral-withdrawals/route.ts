import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { logUserActivity } from '@/lib/user-activity'
import { createAccountBalanceEntry, hasSettledEntryForReference } from '@/lib/account-balance'
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

    const existing = await prisma.referralWithdrawal.findUnique({
      where: { id },
      select: { id: true, userId: true, amountUsd: true, amountCrypto: true, coinType: true, status: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Referral withdrawal not found.' }, { status: 404 })
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

    const withdrawalReference = `referral-withdrawal:${updated.id}`
    const movesToSettled = ['approved', 'processed'].includes(status) && !['approved', 'processed'].includes(existing.status)
    if (movesToSettled) {
      const hasDebit = await hasSettledEntryForReference(updated.userId, withdrawalReference, 'debit')
      if (!hasDebit) {
        await createAccountBalanceEntry({
          userId: updated.userId,
          direction: 'debit',
          status: 'settled',
          amountUsd: Number(updated.amountUsd),
          source: 'referral_withdrawal',
          referenceId: withdrawalReference,
          note: 'Referral withdrawal approved.',
          metadata: {
            withdrawalId: updated.id,
            status,
            coinType: existing.coinType,
            amountCrypto: Number(existing.amountCrypto),
          },
        })
      }
    }

    const rejectedFromPending = status === 'rejected' && existing.status !== 'rejected'
    if (rejectedFromPending) {
      await createAccountBalanceEntry({
        userId: updated.userId,
        direction: 'debit',
        status: 'rejected',
        amountUsd: Number(updated.amountUsd),
        source: 'referral_withdrawal',
        referenceId: withdrawalReference,
        note: 'Referral withdrawal request rejected.',
        metadata: {
          withdrawalId: updated.id,
          previousStatus: existing.status,
          coinType: existing.coinType,
          amountCrypto: Number(existing.amountCrypto),
        },
      })
    }

    const reversalReference = `referral-withdrawal-reversal:${updated.id}`
    const becomesRejectedAfterSettled = status === 'rejected' && ['approved', 'processed'].includes(existing.status)
    if (becomesRejectedAfterSettled) {
      const hasReversal = await hasSettledEntryForReference(updated.userId, reversalReference, 'credit')
      if (!hasReversal) {
        await createAccountBalanceEntry({
          userId: updated.userId,
          direction: 'credit',
          status: 'settled',
          amountUsd: Number(updated.amountUsd),
          source: 'withdrawal_reversal',
          referenceId: reversalReference,
          note: 'Referral withdrawal reversed after rejection.',
          metadata: {
            withdrawalId: updated.id,
            previousStatus: existing.status,
            coinType: existing.coinType,
            amountCrypto: Number(existing.amountCrypto),
          },
        })
      }
    }

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
