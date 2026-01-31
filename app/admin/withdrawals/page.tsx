import { prisma } from '@/lib/db'
import WithdrawalApproval from '@/components/admin/WithdrawalApproval'

export const dynamic = 'force-dynamic'

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Withdrawals</h1>
        <p className="text-white/70">Review and process withdrawal requests.</p>
      </div>

      {data.length === 0 ? (
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
        <div className="space-y-4">
          {data.map(item => (
            <WithdrawalApproval key={item.id} withdrawal={item} />
          ))}
        </div>
      )}
    </div>
  )
}
