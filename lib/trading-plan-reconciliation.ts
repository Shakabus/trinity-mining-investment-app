import { prisma } from '@/lib/db'
import { getAccountBalanceEntries } from '@/lib/account-balance'
import { PAYMENT_REMINDER_TIMEOUT_MS } from '@/lib/payment-reminder'

export async function reconcileRejectedTradingPendingPlans(userId: number) {
  const [candidates, balanceEntries] = await Promise.all([
    prisma.tradingUserPlan.findMany({
      where: {
        userId,
        status: { in: ['selected', 'awaiting_payment'] },
        paymentStatus: 'pending',
      },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    }),
    getAccountBalanceEntries(userId, { limit: 3000 }),
  ])

  const latestBalanceByReference = new Map<string, (typeof balanceEntries)[number]>()
  for (const entry of balanceEntries) {
    if (entry.source !== 'trading_plan_purchase' || entry.direction !== 'debit') continue
    if (latestBalanceByReference.has(entry.referenceId)) continue
    latestBalanceByReference.set(entry.referenceId, entry)
  }

  const ledgerStateByPlanId = new Map<number, { hasPending: boolean; hasRejected: boolean; hasSettled: boolean }>()
  for (const entry of latestBalanceByReference.values()) {
    const tradingUserPlanId = Number(entry.metadata?.tradingUserPlanId)
    if (!Number.isFinite(tradingUserPlanId) || tradingUserPlanId <= 0) continue

    const state = ledgerStateByPlanId.get(tradingUserPlanId) ?? {
      hasPending: false,
      hasRejected: false,
      hasSettled: false,
    }

    if (entry.status === 'pending') state.hasPending = true
    if (entry.status === 'rejected') state.hasRejected = true
    if (entry.status === 'settled') state.hasSettled = true

    ledgerStateByPlanId.set(tradingUserPlanId, state)
  }

  const nowMs = Date.now()
  const reminderCutoffMs = nowMs - PAYMENT_REMINDER_TIMEOUT_MS

  const staleIds = candidates
    .filter(plan => {
      const latestPaymentStatus = plan.payments[0]?.status ?? null
      if (latestPaymentStatus === 'rejected') return true

      const ledgerState = ledgerStateByPlanId.get(plan.id)
      const hasOpenReview = latestPaymentStatus === 'pending' || Boolean(ledgerState?.hasPending)
      if (ledgerState?.hasRejected && !ledgerState.hasPending && !ledgerState.hasSettled) {
        return true
      }

      // If plan stayed unsubmitted past reminder timeout, auto-clear it so user can select again.
      const isExpiredUnsubmitted =
        plan.createdAt.getTime() <= reminderCutoffMs && !hasOpenReview

      return isExpiredUnsubmitted
    })
    .map(plan => plan.id)

  if (!staleIds.length) return 0

  const [result] = await prisma.$transaction([
    prisma.tradingUserPlan.updateMany({
      where: { id: { in: staleIds } },
      data: {
        status: 'rejected',
        paymentStatus: 'rejected',
        startDate: null,
        endDate: null,
      },
    }),
    prisma.tradingPayment.updateMany({
      where: {
        tradingUserPlanId: { in: staleIds },
        status: 'pending',
      },
      data: {
        status: 'rejected',
        transactionId: 'Account Balance - Rejected',
        confirmations: 0,
        confirmedAt: null,
        confirmedByAdminId: null,
      },
    }),
  ])

  return result.count
}
