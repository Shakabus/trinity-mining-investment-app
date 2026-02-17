import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { logUserActivity } from '@/lib/user-activity'
import { createAccountBalanceEntry, getAccountBalanceEntries } from '@/lib/account-balance'
import {
  isInputValidationError,
  readJsonObject,
  readNumberField,
} from '@/lib/requestValidation'

const REJECT_TRADING_PAYMENT_FIELDS = ['tradingUserPlanId'] as const

const isAccountBalancePending = (txid: string | null | undefined) =>
  typeof txid === 'string' && txid.startsWith('Account Balance - Pending')

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

    const body = await readJsonObject(req, { allowedKeys: REJECT_TRADING_PAYMENT_FIELDS })
    const tradingUserPlanId = readNumberField(body, 'tradingUserPlanId', {
      required: true,
      integer: true,
      min: 1,
    })!

    const tradingPlan = await prisma.tradingUserPlan.findUnique({
      where: { id: tradingUserPlanId },
      include: {
        plan: true,
        payments: {
          where: { status: 'pending' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!tradingPlan) {
      return NextResponse.json({ error: 'Trading plan not found' }, { status: 404 })
    }

    if (!['awaiting_payment', 'selected'].includes(tradingPlan.status) || tradingPlan.paymentStatus !== 'pending') {
      return NextResponse.json({ error: 'Payment already processed for this plan.' }, { status: 409 })
    }

    const pendingPayment = tradingPlan.payments[0] ?? null
    const balancePayment = isAccountBalancePending(pendingPayment?.transactionId)
    const purchaseRef = `trading-plan:${tradingPlan.id}`

    await prisma.$transaction(
      async tx => {
        if (balancePayment) {
        const entries = await getAccountBalanceEntries(tradingPlan.userId, { limit: 3000 }, tx)
        const latestByReference = new Map<string, (typeof entries)[number]>()
        for (const entry of entries) {
          if (entry.source !== 'trading_plan_purchase' || entry.direction !== 'debit') continue
          const metadataPlanId = Number(entry.metadata?.tradingUserPlanId)
          const matchesPlanByMetadata = Number.isFinite(metadataPlanId) && metadataPlanId === tradingPlan.id
          const matchesPlanByReference =
            entry.referenceId === purchaseRef || entry.referenceId.startsWith(`${purchaseRef}:`)
          if (!matchesPlanByMetadata && !matchesPlanByReference) continue
          const current = latestByReference.get(entry.referenceId)
          if (!current || current.createdAt.getTime() < entry.createdAt.getTime()) {
            latestByReference.set(entry.referenceId, entry)
          }
        }

        const pendingSegments = [...latestByReference.values()].filter(entry => entry.status === 'pending')

        for (const pendingEntry of pendingSegments) {
          await createAccountBalanceEntry(
            {
              userId: tradingPlan.userId,
              direction: 'debit',
              status: 'rejected',
              amountUsd: Number(pendingEntry.amountUsd),
              source: 'trading_plan_purchase',
              referenceId: pendingEntry.referenceId,
              note: `Trading plan payment rejected (${tradingPlan.plan.name}).`,
              metadata: {
                ...(pendingEntry.metadata ?? {}),
                reviewedByAdminId: adminUser.id,
                reviewedAt: new Date().toISOString(),
              },
            },
            tx
          )
        }
        }

        await tx.tradingUserPlan.update({
        where: { id: tradingPlan.id },
        data: {
          status: 'rejected',
          paymentStatus: 'rejected',
          startDate: null,
          endDate: null,
        },
      })

        if (pendingPayment) {
          await tx.tradingPayment.update({
          where: { id: pendingPayment.id },
          data: {
            status: 'rejected',
            transactionId: balancePayment ? 'Account Balance - Rejected' : pendingPayment.transactionId,
            confirmations: 0,
            confirmedAt: null,
            confirmedByAdminId: null,
          },
        })
        }

        const hasActiveMining = await tx.userPlan.count({
          where: { userId: tradingPlan.userId, status: 'active' },
        })
        const hasActiveTrading = await tx.tradingUserPlan.count({
          where: { userId: tradingPlan.userId, status: 'active' },
        })

        await tx.user.update({
          where: { id: tradingPlan.userId },
          data: { accountStatus: hasActiveMining > 0 || hasActiveTrading > 0 ? 'active' : 'inactive' },
        })
      },
      { maxWait: 5_000, timeout: 15_000 }
    )

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
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error rejecting trading payment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
