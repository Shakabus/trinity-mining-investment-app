import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import TradingPaymentInstructions from '@/components/trading/TradingPaymentInstructions'
import { getAccountBalanceSummary } from '@/lib/account-balance'
import { reconcileRejectedTradingPendingPlans } from '@/lib/trading-plan-reconciliation'

export const dynamic = 'force-dynamic'

export default async function TradingPaymentPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const userBase = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: { id: true },
  })
  if (!userBase) {
    redirect('/sign-in')
  }

  await reconcileRejectedTradingPendingPlans(userBase.id)

  const user = await prisma.user.findUnique({
    where: { id: userBase.id },
    include: {
      tradingPlans: {
        where: {
          status: { in: ['selected', 'awaiting_payment'] },
          paymentStatus: 'pending',
        },
        include: {
          plan: true,
          payments: {
            where: { status: 'pending' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  const pendingPlan = user?.tradingPlans[0]

  if (!pendingPlan) {
    redirect('/dashboard/investment-trading')
  }

  const planData = {
    id: pendingPlan.id,
    status: pendingPlan.status,
    paymentStatus: pendingPlan.paymentStatus,
    planName: pendingPlan.plan.name,
    investmentUsd: Number(pendingPlan.investmentUsd),
    expectedReturnUsd: Number(pendingPlan.expectedReturnUsd),
    durationHours: pendingPlan.durationHours,
    createdAt: pendingPlan.createdAt,
    payment: pendingPlan.payments[0]
      ? {
          id: pendingPlan.payments[0].id,
          transactionId: pendingPlan.payments[0].transactionId,
          paymentProofUrl: pendingPlan.payments[0].paymentProofUrl,
          createdAt: pendingPlan.payments[0].createdAt,
        }
      : null,
  }

  const balanceSummary = await getAccountBalanceSummary(userBase.id)

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 lg:px-6">
      <TradingPaymentInstructions
        plan={planData}
        accountBalanceUsd={balanceSummary.availableToSpendUsd}
      />
    </div>
  )
}
