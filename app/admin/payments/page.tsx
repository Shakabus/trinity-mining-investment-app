import { prisma } from '@/lib/db'
import PaymentApproval from '@/components/admin/PaymentApproval'
import TradingPaymentApproval from '@/components/admin/TradingPaymentApproval'

export const dynamic = 'force-dynamic'

export default async function AdminPaymentsPage() {
  const pendingPlans = await prisma.userPlan.findMany({
    where: {
      status: 'awaiting_payment',
      paymentStatus: 'pending'
    },
    include: {
      user: true,
      plan: true,
      payments: {
        where: { status: 'pending' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  // Convert Decimals to numbers
  const payments = pendingPlans.map(up => ({
    id: up.id,
    userId: up.userId,
    userName: up.user.fullName || up.user.email,
    userEmail: up.user.email,
    planName: up.plan.name,
    coinType: up.plan.coinType,
    durationDays: up.selectedDurationDays,
    finalPrice: parseFloat(up.finalPrice.toString()),
    createdAt: up.createdAt,
    proof: up.payments[0]
      ? {
          paymentProofUrl: up.payments[0].paymentProofUrl,
          transactionId: up.payments[0].transactionId,
          cryptoType: up.payments[0].cryptoType,
          createdAt: up.payments[0].createdAt,
        }
      : null,
  }))

  const pendingTradingPlans = await prisma.tradingUserPlan.findMany({
    where: {
      status: 'awaiting_payment',
      paymentStatus: 'pending',
    },
    include: {
      user: true,
      plan: true,
      payments: {
        where: { status: 'pending' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const tradingPayments = pendingTradingPlans.map(plan => ({
    id: plan.id,
    userId: plan.userId,
    userName: plan.user.fullName || plan.user.email,
    userEmail: plan.user.email,
    planName: plan.plan.name,
    investmentUsd: Number(plan.investmentUsd),
    durationHours: plan.durationHours,
    createdAt: plan.createdAt,
    proof: plan.payments[0]
      ? {
          paymentProofUrl: plan.payments[0].paymentProofUrl,
          transactionId: plan.payments[0].transactionId,
          cryptoType: plan.payments[0].cryptoType,
          createdAt: plan.payments[0].createdAt,
        }
      : null,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          Payment Approvals
        </h1>
        <p className="text-white/70">
          Review and approve pending payment requests ({payments.length + tradingPayments.length} pending)
        </p>
      </div>

      {/* Mining Payments */}
      {payments.length === 0 ? (
        <div 
          className="p-12 md:p-16 rounded-3xl text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="text-6xl mb-6">✅</div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">All Caught Up!</h2>
          <p className="text-white/70">
            No pending payments to review at the moment
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <PaymentApproval key={payment.id} payment={payment} />
          ))}
        </div>
      )}

      {/* Trading Payments */}
      <div className="pt-8">
        <h2 className="text-2xl font-semibold text-white mb-4">Trading Investment Payments</h2>
        {tradingPayments.length === 0 ? (
          <div
            className="p-10 rounded-3xl text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
            }}
          >
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-white mb-2">No trading payments pending</h3>
            <p className="text-white/70">New trading payment requests will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tradingPayments.map((payment) => (
              <TradingPaymentApproval key={`trading-${payment.id}`} payment={payment} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
