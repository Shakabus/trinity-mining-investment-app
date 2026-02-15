import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import TradingPaymentInstructions from '@/components/trading/TradingPaymentInstructions'
import { getAccountBalanceSummary } from '@/lib/account-balance'

export const dynamic = 'force-dynamic'

export default async function TradingPaymentPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
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

  const balanceSummary = await getAccountBalanceSummary(user.id)

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 lg:px-6">
      <TradingPaymentInstructions
        plan={planData}
        accountBalanceUsd={balanceSummary.balanceUsd}
      />
    </div>
  )
}
