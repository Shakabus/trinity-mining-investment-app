import { prisma } from '@/lib/db'
import PaymentApproval from '@/components/admin/PaymentApproval'
import TradingPaymentApproval from '@/components/admin/TradingPaymentApproval'
import RealEstatePaymentApproval from '@/components/admin/RealEstatePaymentApproval'
import { REAL_ESTATE_BUY_IN_TICKET_PREFIX } from '@/lib/real-estate-dashboard'

export const dynamic = 'force-dynamic'

const parseLabel = (body: string, label: string) => {
  const regex = new RegExp(`^${label}:\\s*(.+)$`, 'im')
  const match = body.match(regex)
  return match?.[1]?.trim() ?? ''
}

export default async function AdminPaymentsPage() {
  const pendingPlans = await prisma.userPlan.findMany({
    where: {
      status: 'awaiting_payment',
      paymentStatus: 'pending',
      payments: {
        some: { status: 'pending' },
      },
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
      createdAt: 'desc',
    },
  })

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
      status: { in: ['awaiting_payment', 'selected'] },
      paymentStatus: 'pending',
      payments: {
        some: { status: 'pending' },
      },
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

  const realEstateTickets = await prisma.supportTicket.findMany({
    where: {
      subject: { startsWith: REAL_ESTATE_BUY_IN_TICKET_PREFIX },
      status: { in: ['open', 'waiting'] },
    },
    include: {
      user: true,
      messages: {
        where: { senderRole: 'user' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const realEstatePayments = realEstateTickets.map(ticket => {
    const userMessage = ticket.messages[0]
    const body = userMessage?.body || ''

    return {
      ticketId: ticket.id,
      userName: ticket.user.fullName || ticket.user.email,
      userEmail: ticket.user.email,
      property: parseLabel(body, 'Property') || ticket.subject.replace(REAL_ESTATE_BUY_IN_TICKET_PREFIX, '').trim(),
      location: parseLabel(body, 'Location'),
      tier: parseLabel(body, 'Tier'),
      minimum: parseLabel(body, 'Minimum'),
      duration: parseLabel(body, 'Duration'),
      projectedBand: parseLabel(body, 'Projected Band'),
      coinType: parseLabel(body, 'Payment Coin'),
      txid: parseLabel(body, 'TXID'),
      createdAt: ticket.createdAt,
      status: ticket.status as 'open' | 'waiting' | 'closed' | 'rejected',
      proof: userMessage
        ? {
            paymentProofUrl: userMessage.attachmentUrl,
            attachmentName: userMessage.attachmentName,
            createdAt: userMessage.createdAt,
          }
        : null,
    }
  })

  const totalPendingPayments = payments.length + tradingPayments.length + realEstatePayments.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Payment Approvals</h1>
        <p className="text-white/70">
          Review and approve pending payment requests ({totalPendingPayments} pending)
        </p>
      </div>

      {totalPendingPayments === 0 ? (
        <div
          className="p-12 md:p-16 rounded-3xl text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="text-6xl mb-6">OK</div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">All Caught Up</h2>
          <p className="text-white/70">No pending payments to review at the moment</p>
        </div>
      ) : (
        <>
          {payments.length > 0 && (
            <div className="space-y-4">
              {payments.map(payment => (
                <PaymentApproval key={payment.id} payment={payment} />
              ))}
            </div>
          )}

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
                <div className="text-4xl mb-4">OK</div>
                <h3 className="text-xl font-bold text-white mb-2">No trading payments pending</h3>
                <p className="text-white/70">New trading payment requests will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tradingPayments.map(payment => (
                  <TradingPaymentApproval key={`trading-${payment.id}`} payment={payment} />
                ))}
              </div>
            )}
          </div>

          <div className="pt-8">
            <h2 className="text-2xl font-semibold text-white mb-4">Real Estate Buy-In Payments</h2>
            {realEstatePayments.length === 0 ? (
              <div
                className="p-10 rounded-3xl text-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                }}
              >
                <div className="text-4xl mb-4">OK</div>
                <h3 className="text-xl font-bold text-white mb-2">No real-estate payments pending</h3>
                <p className="text-white/70">New real-estate buy-in proofs will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {realEstatePayments.map(payment => (
                  <RealEstatePaymentApproval key={`real-estate-${payment.ticketId}`} payment={payment} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

