import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import TradingWithdrawalsCharts from '@/components/trading/TradingWithdrawalsCharts'
import TradingWithdrawalForm from '@/components/trading/TradingWithdrawalForm'
import EmptyState from '@/components/ui/EmptyState'

export const dynamic = 'force-dynamic'

export default async function TradingWithdrawalsPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      tradingPlans: { orderBy: { createdAt: 'desc' } },
      tradingEarnings: { orderBy: { createdAt: 'desc' } },
      tradingWithdrawals: { orderBy: { requestedAt: 'desc' } },
    },
  })

  const activePlan = user?.tradingPlans.find(plan => plan.status === 'active') ?? null
  const activeEarning = user?.tradingEarnings.find(earning => earning.isActive) ?? null
  const totalEarned = activeEarning ? Number(activeEarning.totalEarnedUsd) : 0
  const totalWithdrawn = user?.tradingWithdrawals.reduce((sum, w) => sum + Number(w.amountUsd), 0) ?? 0
  const availableUsd = Math.max(0, totalEarned - totalWithdrawn)
  const now = new Date()
  const minWithdrawalUsd = Math.min(100, Math.max(20, totalEarned * 0.05))

  const historySeries = user?.tradingWithdrawals.slice(0, 8).map(withdrawal => ({
    time: new Date(withdrawal.requestedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: Number(withdrawal.amountUsd),
  })) ?? []

  const statusCounts = user?.tradingWithdrawals.reduce((acc, withdrawal) => {
    acc[withdrawal.status] = (acc[withdrawal.status] || 0) + 1
    return acc
  }, {} as Record<string, number>) ?? {}

  const statusSeries = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))

  const balanceSeries = Array.from({ length: 8 }, (_, index) => {
    const value = Math.max(0, availableUsd - index * (availableUsd * 0.08))
    return {
      time: new Date(now.getTime() - (7 - index) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Math.round(value * 100) / 100,
    }
  })

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Trading Withdrawals</h1>
        <p className="text-white/70">Request withdrawals from your trading earnings.</p>
      </div>

      {activePlan ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TradingWithdrawalForm availableUsd={availableUsd} minWithdrawalUsd={minWithdrawalUsd} />
            </div>
            <div
              className="p-6 rounded-3xl space-y-3"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
              }}
            >
              <div className="text-xs text-white/60">Available Balance</div>
              <div className="text-2xl font-semibold text-white">${availableUsd.toFixed(2)}</div>
              <div className="text-xs text-white/50">Minimum withdrawal: ${minWithdrawalUsd.toFixed(2)}</div>
            </div>
          </div>

          <TradingWithdrawalsCharts
            historySeries={historySeries}
            statusSeries={statusSeries.length ? statusSeries : [{ name: 'pending', value: 0 }]}
            balanceSeries={balanceSeries}
          />
        </>
      ) : (
        <EmptyState
          title="Activate a trading plan to request withdrawals"
          description="Once your investment plan is active, you can request withdrawals and view payout history."
          actionLabel="Activate a plan"
          actionHref="/dashboard/investment-trading#plans"
        />
      )}

      <div
        className="p-6 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        <h2 className="text-white font-semibold text-lg mb-4">Recent Requests</h2>
        {user?.tradingWithdrawals.length ? (
          <div className="space-y-3 text-sm">
            {user.tradingWithdrawals.slice(0, 8).map(withdrawal => (
              <div key={withdrawal.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="text-white font-semibold">${Number(withdrawal.amountUsd).toFixed(2)}</div>
                <div className="text-white/60">{withdrawal.walletAddress}</div>
                <div className="text-white/50">{withdrawal.status}</div>
                <div className="text-white/40 text-xs">{new Date(withdrawal.requestedAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-white/60 text-sm">No trading withdrawal requests yet.</div>
        )}
      </div>
    </div>
  )
}
