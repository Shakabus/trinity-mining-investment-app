import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import TradingBotCharts from '@/components/trading/TradingBotCharts'
import { buildTradeFeed } from '@/lib/trading'

export const dynamic = 'force-dynamic'

export default async function TradingBotPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      tradingPlans: {
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      },
      tradingStats: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  const activePlan = user?.tradingPlans.find(plan => plan.status === 'active') ?? user?.tradingPlans[0] ?? null
  const activeStats = user?.tradingStats.find(stat => stat.isActive) ?? user?.tradingStats[0] ?? null
  const seed = (user?.id || 1) * 17
  const now = new Date()
  const baseTime = now.getTime()

  const priceSeries = Array.from({ length: 18 }, (_, index) => {
    const value = 120 + Math.sin(seed + index * 0.6) * 18 + index * 1.1
    return {
      time: new Date(baseTime - (17 - index) * 600000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      value: Math.round(value * 100) / 100,
    }
  })

  const pnlSeries = Array.from({ length: 18 }, (_, index) => {
    const value = Math.sin(seed * 0.3 + index * 0.5) * 120 + index * 8
    return {
      time: new Date(baseTime - (17 - index) * 600000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      value: Math.round(value * 100) / 100,
    }
  })

  const volumeSeries = Array.from({ length: 12 }, (_, index) => ({
    time: new Date(baseTime - (11 - index) * 3600000).toLocaleTimeString('en-US', { hour: '2-digit' }),
    value: Math.round(40 + Math.abs(Math.sin(seed + index) * 60)),
  }))

  const trades = buildTradeFeed(seed, 12)

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Trading Bot Activity</h1>
        <p className="text-white/70">
          Live trade executions, strategy activity, and portfolio pulses.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className="p-4 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="text-xs text-white/60">Active Strategy</div>
          <div className="text-lg font-semibold text-white mt-2">{activeStats?.strategy ?? 'Adaptive Momentum'}</div>
        </div>
        <div
          className="p-4 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="text-xs text-white/60">Bot Speed</div>
          <div className="text-lg font-semibold text-white mt-2">{activeStats?.botSpeed?.toString() ?? '1.0'}x</div>
        </div>
        <div
          className="p-4 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="text-xs text-white/60">Plan</div>
          <div className="text-lg font-semibold text-white mt-2">{activePlan?.plan.name ?? 'No active plan'}</div>
        </div>
      </div>

      <TradingBotCharts priceSeries={priceSeries} pnlSeries={pnlSeries} volumeSeries={volumeSeries} />

      <div
        className="p-6 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        <h2 className="text-white font-semibold text-lg mb-4">Live Trade Feed</h2>
        <div className="space-y-3">
          {trades.map(trade => (
            <div key={trade.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm">
              <div className="text-white font-semibold">{trade.side} {trade.asset}</div>
              <div className="text-white/60">${trade.price.toFixed(2)}</div>
              <div className={trade.pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
              </div>
              <div className="text-white/40 text-xs">{trade.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
