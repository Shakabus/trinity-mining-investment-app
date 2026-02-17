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

const REJECT_PAYMENT_FIELDS = ['userPlanId'] as const

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

    const body = await readJsonObject(req, { allowedKeys: REJECT_PAYMENT_FIELDS })
    const userPlanId = readNumberField(body, 'userPlanId', { required: true, integer: true, min: 1 })!

    const userPlan = await prisma.userPlan.findUnique({
      where: { id: userPlanId },
      include: {
        plan: true,
        payments: {
          where: { status: 'pending' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!userPlan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    if (!['awaiting_payment', 'selected'].includes(userPlan.status) || userPlan.paymentStatus !== 'pending') {
      return NextResponse.json({ error: 'Payment already processed for this plan.' }, { status: 409 })
    }

    const pendingPayment = userPlan.payments[0] ?? null
    const balancePayment = isAccountBalancePending(pendingPayment?.transactionId)
    const purchaseRef = `mining-plan:${userPlan.id}`

    await prisma.$transaction(async tx => {
      if (balancePayment) {
        const entries = await getAccountBalanceEntries(userPlan.userId, { limit: 3000 }, tx)
        const latestByReference = new Map<string, (typeof entries)[number]>()
        for (const entry of entries) {
          if (entry.source !== 'mining_plan_purchase' || entry.direction !== 'debit') continue
          if (Number(entry.metadata?.userPlanId) !== userPlan.id) continue
          const current = latestByReference.get(entry.referenceId)
          if (!current || current.createdAt.getTime() < entry.createdAt.getTime()) {
            latestByReference.set(entry.referenceId, entry)
          }
        }
        const pendingSegments = [...latestByReference.values()].filter(entry => entry.status === 'pending')

        for (const pendingEntry of pendingSegments) {
          await createAccountBalanceEntry(
            {
              userId: userPlan.userId,
              direction: 'debit',
              status: 'rejected',
              amountUsd: Number(pendingEntry.amountUsd),
              source: 'mining_plan_purchase',
              referenceId: pendingEntry.referenceId,
              note: `Mining plan payment rejected (${userPlan.plan.name}).`,
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

      await tx.userPlan.update({
        where: { id: userPlan.id },
        data: {
          status: 'selected',
          paymentStatus: 'pending',
          startDate: null,
          endDate: null,
        },
      })

      if (pendingPayment) {
        await tx.payment.update({
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
        where: { userId: userPlan.userId, status: 'active' },
      })
      const hasActiveTrading = await tx.tradingUserPlan.count({
        where: { userId: userPlan.userId, status: 'active' },
      })

      await tx.user.update({
        where: { id: userPlan.userId },
        data: { accountStatus: hasActiveMining > 0 || hasActiveTrading > 0 ? 'active' : 'inactive' },
      })
    })

    await logUserActivity({
      userId: userPlan.userId,
      action: 'PaymentRejected',
      detail: 'Payment was rejected.',
    })

    return NextResponse.json({
      success: true,
      message: 'Payment rejected and plan not activated',
    })
  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error rejecting payment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
