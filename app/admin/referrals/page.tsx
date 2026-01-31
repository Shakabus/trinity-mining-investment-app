import { prisma } from '@/lib/db'
import ReferralSettingsPanel from '@/components/admin/ReferralSettingsPanel'
import ReferralWithdrawalApproval from '@/components/admin/ReferralWithdrawalApproval'

const DEFAULT_REFERRAL_SETTINGS = {
  isEnabled: true,
  bonusPercent: 5,
  minPaymentUsd: 100,
  minWithdrawalUsd: 50,
}

export default async function AdminReferralsPage() {
  const settingsRow = await prisma.referralSettings.findFirst()
  const settings = settingsRow
    ? {
        isEnabled: settingsRow.isEnabled,
        bonusPercent: Number(settingsRow.bonusPercent),
        minPaymentUsd: Number(settingsRow.minPaymentUsd),
        minWithdrawalUsd: Number(settingsRow.minWithdrawalUsd),
      }
    : DEFAULT_REFERRAL_SETTINGS

  const withdrawals = await prisma.referralWithdrawal.findMany({
    orderBy: { requestedAt: 'desc' },
    include: {
      user: true,
    },
  })

  const bonuses = await prisma.referralBonus.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      referrer: true,
      referee: true,
    },
    take: 20,
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Referrals</h1>
        <p className="text-white/70">Manage referral settings, bonuses, and withdrawals.</p>
      </div>

      <ReferralSettingsPanel {...settings} />

      <div
        className="p-6 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        <h2 className="text-white font-semibold text-lg mb-4">Referral Withdrawals</h2>
        {withdrawals.length === 0 ? (
          <div className="text-white/60 text-sm">No referral withdrawals yet.</div>
        ) : (
          <div className="space-y-4">
            {withdrawals.map(item => (
              <ReferralWithdrawalApproval
                key={item.id}
                withdrawal={{
                  id: item.id,
                  userId: item.userId,
                  userName: item.user.fullName || 'User',
                  userEmail: item.user.email,
                  amountUsd: Number(item.amountUsd),
                  coinType: item.coinType,
                  walletAddress: item.walletAddress,
                  status: item.status,
                  requestedAt: item.requestedAt.toISOString(),
                  transactionId: item.transactionId,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div
        className="p-6 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        <h2 className="text-white font-semibold text-lg mb-4">Recent Referral Bonuses</h2>
        {bonuses.length === 0 ? (
          <div className="text-white/60 text-sm">No referral bonuses recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/50 text-left">
                  <th className="py-2">Date</th>
                  <th className="py-2">Referrer</th>
                  <th className="py-2">Referee</th>
                  <th className="py-2">Amount (USD)</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {bonuses.map(bonus => (
                  <tr key={bonus.id} className="border-t border-white/10">
                    <td className="py-2 text-white/80">{bonus.createdAt.toLocaleString()}</td>
                    <td className="py-2 text-white/80">{bonus.referrer.fullName || bonus.referrer.email}</td>
                    <td className="py-2 text-white/80">{bonus.referee.fullName || bonus.referee.email}</td>
                    <td className="py-2 text-white/80">${Number(bonus.amountUsd).toFixed(2)}</td>
                    <td className="py-2 text-white/80">{bonus.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
