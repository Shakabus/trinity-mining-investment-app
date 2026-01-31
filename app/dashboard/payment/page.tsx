import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import PaymentInstructions from '@/components/dashboard/PaymentInstructions'

export default async function PaymentPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      userPlans: {
        where: {
          status: 'awaiting_payment',
          paymentStatus: 'pending'
        },
        include: {
          plan: true,
          payments: {
            where: { status: 'pending' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 1
      }
    }
  })

  const pendingPlan = user?.userPlans[0]

  if (!pendingPlan) {
    redirect('/dashboard/plans')
  }

  // Convert Decimals to numbers
  const planData = {
    id: pendingPlan.id,
    planName: pendingPlan.plan.name,
    coinType: pendingPlan.plan.coinType,
    selectedDurationDays: pendingPlan.selectedDurationDays,
    finalPrice: parseFloat(pendingPlan.finalPrice.toString()),
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

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 lg:px-6">
      <PaymentInstructions plan={planData} />
    </div>
  )
}
