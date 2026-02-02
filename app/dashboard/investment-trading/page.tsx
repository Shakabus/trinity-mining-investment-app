import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import TradingOverviewCharts from '@/components/trading/TradingOverviewCharts'
import TradingPlanCard from '@/components/trading/TradingPlanCard'
import TradingSectionObserver from '@/components/trading/TradingSectionObserver'
import { buildAllocationSeries, buildTradingSeries, simulateTradingProgress } from '@/lib/trading'
import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function TradingInvestmentPage() {
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
      tradingEarnings: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  const tradingPlans = await prisma.tradingPlan.findMany({
    where: { status: 'active' },
    orderBy: { minInvestmentUsd: 'asc' },
  })

  const activePlan = user?.tradingPlans.find(plan => plan.status === 'active') ?? user?.tradingPlans[0] ?? null
  const activeStats = user?.tradingStats.find(stat => stat.isActive) ?? user?.tradingStats[0] ?? null
  const activeEarnings = user?.tradingEarnings.find(earning => earning.isActive) ?? user?.tradingEarnings[0] ?? null
  const now = new Date()

  let snapshot = null as null | {
    equityUsd: number
    pnlUsd: number
    dailyEstimateUsd: number
    winRate: number
    openPositions: number
  }

  if (activePlan && activePlan.startDate) {
    const startDate = activePlan.startDate
    const endDate = activePlan.endDate ?? new Date(startDate.getTime() + activePlan.durationHours * 60 * 60 * 1000)
    const seed = user ? user.id * 13 + activePlan.id * 7 : 42

    snapshot = simulateTradingProgress({
      investmentUsd: Number(activePlan.investmentUsd),
      expectedReturnUsd: Number(activePlan.expectedReturnUsd),
      durationHours: activePlan.durationHours,
      startDate,
      now,
      seed,
    })

    if (activeEarnings && !activeEarnings.isAdminOverride) {
      await prisma.tradingEarning.update({
        where: { id: activeEarnings.id },
        data: {
          totalEarnedUsd: snapshot.equityUsd,
          dailyEstimateUsd: snapshot.dailyEstimateUsd,
          lastCalculatedAt: now,
        },
      })
    }

    if (activeStats) {
      await prisma.tradingStat.update({
        where: { id: activeStats.id },
        data: {
          lastEquityUsd: snapshot.equityUsd,
          lastPnlUsd: snapshot.pnlUsd,
          winRate: snapshot.winRate,
          openPositions: snapshot.openPositions,
          lastSimulatedAt: now,
        },
      })
    }
  }

  const startDate = activePlan?.startDate ?? activePlan?.createdAt ?? now
  const endDate = activePlan?.endDate ?? (activePlan ? new Date(startDate.getTime() + activePlan.durationHours * 60 * 60 * 1000) : now)
  const series = activePlan
    ? buildTradingSeries({
        points: 12,
        startDate,
        endDate,
        expectedReturnUsd: Number(activePlan.expectedReturnUsd),
        investmentUsd: Number(activePlan.investmentUsd),
        seed: (user?.id || 1) * 11,
      })
    : []

  const equitySeries = series.map(point => ({
    time: point.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    value: point.value + Number(activePlan?.investmentUsd || 0),
  }))
  const pnlSeries = series.map(point => ({
    time: point.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    value: point.pnl,
  }))

  const allocationSeries = buildAllocationSeries((user?.id || 1) * 3)
  const performanceSeries = allocationSeries.map(item => ({ label: item.name, value: item.value }))

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8">
      <TradingSectionObserver />
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Investment Trading</h1>
          <p className="text-white/70 max-w-2xl">
            Track your trading portfolio, simulated bot activity, and performance insights in one workspace.
          </p>
        </div>
        <Link
          href="/dashboard/investment-trading/bot"
          className="px-5 py-3 rounded-full text-sm font-semibold transition-all hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, #582dff, #3a137a)',
            color: '#ffffff',
          }}
        >
          View Bot Activity <ArrowUpRight size={16} className="inline-block ml-2" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div
          className="p-4 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="text-xs text-white/60">Active Plan</div>
          <div className="text-lg font-semibold text-white mt-2">{activePlan?.plan.name ?? 'Not Active'}</div>
        </div>
        <div
          className="p-4 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="text-xs text-white/60">Portfolio Equity</div>
          <div className="text-lg font-semibold text-white mt-2">
            ${snapshot ? snapshot.equityUsd.toFixed(2) : '0.00'}
          </div>
        </div>
        <div
          className="p-4 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="text-xs text-white/60">Realized P/L</div>
          <div className="text-lg font-semibold text-white mt-2">
            ${snapshot ? snapshot.pnlUsd.toFixed(2) : '0.00'}
          </div>
        </div>
        <div
          className="p-4 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="text-xs text-white/60">Open Positions</div>
          <div className="text-lg font-semibold text-white mt-2">
            {snapshot ? snapshot.openPositions : 0}
          </div>
        </div>
      </div>

      <TradingOverviewCharts
        equitySeries={equitySeries}
        pnlSeries={pnlSeries}
        allocationSeries={allocationSeries}
        performanceSeries={performanceSeries}
      />

      <section id="plans" className="space-y-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white">Trading Plans</h2>
          <p className="text-white/70">Select a trading investment package to activate your bot.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tradingPlans.map(plan => (
            <TradingPlanCard
              key={plan.id}
              plan={{
                id: plan.id,
                name: plan.name,
                minInvestmentUsd: Number(plan.minInvestmentUsd),
                maxInvestmentUsd: Number(plan.maxInvestmentUsd),
                minDurationHours: plan.minDurationHours,
                maxDurationHours: plan.maxDurationHours,
                minReturnMultiplier: Number(plan.minReturnMultiplier),
                maxReturnMultiplier: Number(plan.maxReturnMultiplier),
              }}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
