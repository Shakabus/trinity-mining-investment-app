import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import TradingEarningsCharts from '@/components/trading/TradingEarningsCharts'
import { buildTradingSeries, simulateTradingProgress } from '@/lib/trading'
import EmptyState from '@/components/ui/EmptyState'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function TradingEarningsPage() {
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
      tradingEarnings: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  const activePlan = user?.tradingPlans.find(plan => plan.status === 'active') ?? null
  const activeEarning = user?.tradingEarnings.find(earning => earning.isActive) ?? null
  const now = new Date()

  let snapshot = null as null | { dailyEstimateUsd: number; earnedUsd: number }
  if (activePlan && activePlan.startDate) {
    const startDate = activePlan.startDate
    const seed = (user?.id || 1) * 13 + activePlan.id * 7
    snapshot = simulateTradingProgress({
      investmentUsd: Number(activePlan.investmentUsd),
      expectedReturnUsd: Number(activePlan.expectedReturnUsd),
      durationHours: activePlan.durationHours,
      startDate,
      now,
      seed,
    })

    if (activeEarning && !activeEarning.isAdminOverride) {
      await prisma.tradingEarning.update({
        where: { id: activeEarning.id },
        data: {
          totalEarnedUsd: snapshot.earnedUsd,
          dailyEstimateUsd: snapshot.dailyEstimateUsd,
          lastCalculatedAt: now,
        },
      })
    }
  }

  const startDate = activePlan?.startDate ?? activePlan?.createdAt ?? now
  const endDate = activePlan?.endDate ?? (activePlan ? new Date(startDate.getTime() + activePlan.durationHours * 60 * 60 * 1000) : now)
  const series = activePlan
    ? buildTradingSeries({
        points: 16,
        startDate,
        endDate,
        expectedReturnUsd: Number(activePlan.expectedReturnUsd),
        investmentUsd: Number(activePlan.investmentUsd),
        seed: (user?.id || 1) * 9,
      })
    : []

  const earningsSeries = series.map(point => ({
    time: point.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    value: point.value,
  }))

  const estimateSeries = [
    {
      label: 'Daily',
      estimated: activeEarning ? Number(activeEarning.dailyEstimateUsd) : 0,
      actual: series.length > 0 ? series[series.length - 1].value / Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / 86400000)) : 0,
    },
  ]

  const isActive = Boolean(activePlan)
  const displayTotalEarned = isActive
    ? (snapshot ? snapshot.earnedUsd : (activeEarning ? Number(activeEarning.totalEarnedUsd) : 0))
    : 0
  const displayDailyEstimate = isActive
    ? (snapshot ? snapshot.dailyEstimateUsd : (activeEarning ? Number(activeEarning.dailyEstimateUsd) : 0))
    : 0

  const drawdownSeries = series.map(point => ({
    time: point.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    value: Math.max(0, point.pnl * -0.2),
  }))

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Trading Earnings</h1>
        <p className="text-white/70">Track trading profit, estimates, and momentum.</p>
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
          <div className="text-xs text-white/60">Total Earned</div>
          <div className="text-lg font-semibold text-white mt-2">${displayTotalEarned.toFixed(2)}</div>
        </div>
        <div
          className="p-4 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="text-xs text-white/60">Daily Estimate</div>
          <div className="text-lg font-semibold text-white mt-2">${displayDailyEstimate.toFixed(2)}</div>
        </div>
        <div
          className="p-4 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="text-xs text-white/60">Expected Return</div>
          <div className="text-lg font-semibold text-white mt-2">${activePlan ? Number(activePlan.expectedReturnUsd).toFixed(2) : '0.00'}</div>
        </div>
      </div>

      {activePlan ? (
        <TradingEarningsCharts
          earningsSeries={earningsSeries}
          estimateSeries={estimateSeries}
          drawdownSeries={drawdownSeries}
        />
      ) : (
        <EmptyState
          title="Activate a trading plan to view earnings"
          description="Trading earnings, drawdowns, and comparisons appear once your portfolio is active."
          action={
            <Link
              href="/dashboard/investment-trading#plans"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #582dff, #3a137a)',
                color: '#ffffff',
              }}
            >
              Activate a plan
              <ArrowUpRight size={14} />
            </Link>
          }
        />
      )}
    </div>
  )
}
