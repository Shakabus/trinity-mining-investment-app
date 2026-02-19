import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import WithdrawalApproval from '@/components/admin/WithdrawalApproval'
import TradingWithdrawalApproval from '@/components/admin/TradingWithdrawalApproval'
import RealEstateWithdrawalApproval from '@/components/admin/RealEstateWithdrawalApproval'
import { REAL_ESTATE_WITHDRAWAL_TICKET_PREFIX } from '@/lib/real-estate-dashboard'

export const dynamic = 'force-dynamic'

const parseLabel = (body: string, label: string) => {
  const regex = new RegExp(`^${label}:\\s*(.+)$`, 'im')
  const match = body.match(regex)
  return match?.[1]?.trim() ?? ''
}

const parseAmount = (value: string) => {
  const num = Number(value.replace(/[^0-9.]/g, ''))
  return Number.isFinite(num) ? num : 0
}

export default async function AdminWithdrawalsPage() {
  const withdrawals = await prisma.withdrawal.findMany({
    include: {
      user: true,
    },
    orderBy: { requestedAt: 'desc' },
  })

  const data = withdrawals.map(item => ({
    id: item.id,
    userName: item.user.fullName || '',
    userEmail: item.user.email,
    coinType: item.coinType,
    amountUsd: Number(item.amountUsd),
    amountCrypto: Number(item.amountCrypto),
    walletAddress: item.walletAddress,
    status: item.status,
    requestedAt: item.requestedAt.toISOString(),
    transactionId: item.transactionId,
  }))

  const tradingWithdrawals = await prisma.$queryRaw<
    Array<{
      id: number
      userName: string | null
      userEmail: string
      amountUsd: Prisma.Decimal | number
      walletAddress: string
      status: string
      requestedAt: Date | string
      transactionId: string | null
    }>
  >(
    Prisma.sql`
      SELECT
        tw.id,
        u.full_name AS userName,
        u.email AS userEmail,
        tw.amount_usd AS amountUsd,
        tw.wallet_address AS walletAddress,
        tw.status,
        tw.requested_at AS requestedAt,
        tw.transaction_id AS transactionId
      FROM trading_withdrawals tw
      INNER JOIN users u ON u.id = tw.user_id
      ORDER BY tw.requested_at DESC
    `
  )

  const tradingData = tradingWithdrawals.map(item => ({
    id: item.id,
    userName: item.userName || '',
    userEmail: item.userEmail,
    amountUsd: Number(item.amountUsd),
    walletAddress: item.walletAddress,
    status: item.status,
    requestedAt: new Date(item.requestedAt).toISOString(),
    transactionId: item.transactionId,
  }))

  const realEstateTickets = await prisma.supportTicket.findMany({
    where: {
      subject: { startsWith: REAL_ESTATE_WITHDRAWAL_TICKET_PREFIX },
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

  const realEstateData = realEstateTickets.map(ticket => {
    const userMessage = ticket.messages[0]
    const body = userMessage?.body || ''
    const requestedAmount = parseAmount(
      parseLabel(body, 'Requested Amount USD') || parseLabel(body, 'Amount'),
    )

    return {
      ticketId: ticket.id,
      userName: ticket.user.fullName || '',
      userEmail: ticket.user.email,
      reference: `RE-WD-${ticket.id}`,
      requestedAt: ticket.createdAt.toISOString(),
      amountUsd: requestedAmount,
      method: parseLabel(body, 'Method') || parseLabel(body, 'Payout Method') || 'Support Managed',
      destination: parseLabel(body, 'Destination') || parseLabel(body, 'Wallet') || '-',
      status: ticket.status as 'open' | 'waiting' | 'closed' | 'rejected',
    }
  })

  const totalRequests = data.length + tradingData.length + realEstateData.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Withdrawals</h1>
        <p className="text-white/70">Review and process withdrawal requests ({totalRequests} total).</p>
      </div>

      {totalRequests === 0 ? (
        <div
          className="p-12 rounded-3xl text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="text-2xl text-white/70">No withdrawal requests yet.</div>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {data.length === 0 ? (
              <div className="text-white/60 text-sm p-6 rounded-2xl border border-white/10 bg-white/[0.04]">
                No mining withdrawal requests yet.
              </div>
            ) : (
              data.map(item => <WithdrawalApproval key={item.id} withdrawal={item} />)
            )}
          </div>

          <div className="pt-6 space-y-4">
            <h2 className="text-2xl font-semibold text-white">Trading Withdrawals</h2>
            {tradingData.length === 0 ? (
              <div className="text-white/60 text-sm p-6 rounded-2xl border border-white/10 bg-white/[0.04]">
                No trading withdrawal requests yet.
              </div>
            ) : (
              tradingData.map(item => <TradingWithdrawalApproval key={`trading-${item.id}`} withdrawal={item} />)
            )}
          </div>

          <div className="pt-6 space-y-4">
            <h2 className="text-2xl font-semibold text-white">Real Estate Withdrawals</h2>
            {realEstateData.length === 0 ? (
              <div className="text-white/60 text-sm p-6 rounded-2xl border border-white/10 bg-white/[0.04]">
                No real-estate withdrawal requests yet.
              </div>
            ) : (
              realEstateData.map(item => (
                <RealEstateWithdrawalApproval key={`real-estate-${item.ticketId}`} withdrawal={item} />
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

