import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/db'
import { createAccountBalanceEntry, type AccountBalanceDirection, type AccountBalanceSource } from '@/lib/account-balance'
import { logUserActivity } from '@/lib/user-activity'
import { isInputValidationError, readBooleanField, readJsonObject, readNumberField, readStringField } from '@/lib/requestValidation'

const LEDGER_ADJUSTMENT_FIELDS = ['userId', 'metric', 'mode', 'amountUsd', 'note', 'notifyUser'] as const

const EDITABLE_METRICS = [
  'balanceUsd',
  'availableUsd',
  'totalDepositsUsd',
  'totalWithdrawalsUsd',
  'totalCreditsUsd',
  'totalDebitsUsd',
] as const

type EditableMetric = (typeof EDITABLE_METRICS)[number]

const isEditableMetric = (value: string): value is EditableMetric =>
  EDITABLE_METRICS.includes(value as EditableMetric)

type AdjustmentConfig = {
  source: AccountBalanceSource
  direction: AccountBalanceDirection
  status: 'settled'
}

function getAdjustmentConfig(metric: EditableMetric, mode: 'increase' | 'decrease'): AdjustmentConfig {
  if (metric === 'totalDepositsUsd') {
    return {
      source: 'funding_deposit',
      direction: mode === 'increase' ? 'credit' : 'debit',
      status: 'settled',
    }
  }

  if (metric === 'totalWithdrawalsUsd') {
    return {
      source: 'account_balance_withdrawal',
      direction: mode === 'increase' ? 'debit' : 'credit',
      status: 'settled',
    }
  }

  if (metric === 'totalDebitsUsd') {
    return {
      source: 'admin_manual_adjustment',
      direction: mode === 'increase' ? 'debit' : 'credit',
      status: 'settled',
    }
  }

  return {
    source: 'admin_manual_adjustment',
    direction: mode === 'increase' ? 'credit' : 'debit',
    status: 'settled',
  }
}

export async function POST(req: Request) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true, role: true },
    })
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await readJsonObject(req, { allowedKeys: LEDGER_ADJUSTMENT_FIELDS })
    const userId = readNumberField(body, 'userId', { required: true, integer: true, min: 1 })!
    const metricRaw = readStringField(body, 'metric', { required: true, maxLength: 60 })!
    if (!isEditableMetric(metricRaw)) {
      return NextResponse.json({ error: 'Unsupported ledger metric.' }, { status: 400 })
    }

    const mode = readStringField(body, 'mode', {
      required: true,
      enumValues: ['increase', 'decrease'],
    }) as 'increase' | 'decrease'
    const amountUsd = readNumberField(body, 'amountUsd', { required: true, min: 0.01, max: 100000000 })!
    const note = readStringField(body, 'note', { maxLength: 240 }) || undefined
    const notifyUser = readBooleanField(body, 'notifyUser') ?? true

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true },
    })
    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found.' }, { status: 404 })
    }

    const adjustment = getAdjustmentConfig(metricRaw, mode)
    const referenceId = `admin-ledger-adjustment:${metricRaw}:${randomUUID()}`

    await createAccountBalanceEntry({
      userId,
      direction: adjustment.direction,
      status: adjustment.status,
      amountUsd,
      source: adjustment.source,
      referenceId,
      note: note ?? `Manual ledger adjustment on ${metricRaw} (${mode}).`,
      metadata: {
        coinType: 'USDT',
        amountCrypto: amountUsd,
        customPaymentMethod: 'Manual ledger adjustment',
        adjustedMetric: metricRaw,
        adjustmentMode: mode,
        adjustedByAdminId: admin.id,
        adjustedAt: new Date().toISOString(),
      },
    })

    await prisma.adminActivityLog.create({
      data: {
        actorAdminId: admin.id,
        targetUserId: userId,
        action: 'AccountBalanceLedgerAdjusted',
        detail: `${metricRaw} ${mode} by $${amountUsd.toFixed(2)}.`,
      },
    })

    if (notifyUser) {
      await logUserActivity({
        userId,
        action: 'AccountBalanceLedgerAdjusted',
        detail: `Account metric ${metricRaw} was ${mode}d by $${amountUsd.toFixed(2)}.`,
      })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: targetUser.id,
        name: targetUser.fullName || targetUser.email || `User #${targetUser.id}`,
      },
    })
  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Admin ledger adjustment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
