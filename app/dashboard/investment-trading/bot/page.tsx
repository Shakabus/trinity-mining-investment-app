import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import TradingBotCharts from '@/components/trading/TradingBotCharts'
import EmptyState from '@/components/ui/EmptyState'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

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

  const activePlan = user?.tradingPlans.find(plan => plan.status === 'active') ?? null
  const activeStats = user?.tradingStats.find(stat => stat.isActive) ?? null
  const seed = (user?.id || 1) * 17
  const now = new Date()
  const baseTime = now.getTime()

  const priceSeries = activePlan ? Array.from({ length: 18 }, (_, index) => {
    const value = 120 + Math.sin(seed + index * 0.6) * 18 + index * 1.1
    return {
      time: new Date(baseTime - (17 - index) * 600000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      value: Math.round(value * 100) / 100,
    }
  }) : []

  const pnlSeries = activePlan ? Array.from({ length: 18 }, (_, index) => {
    const value = Math.sin(seed * 0.3 + index * 0.5) * 120 + index * 8
    return {
      time: new Date(baseTime - (17 - index) * 600000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      value: Math.round(value * 100) / 100,
    }
  }) : []

  const volumeSeries = activePlan ? Array.from({ length: 12 }, (_, index) => ({
    time: new Date(baseTime - (11 - index) * 3600000).toLocaleTimeString('en-US', { hour: '2-digit' }),
    value: Math.round(40 + Math.abs(Math.sin(seed + index) * 60)),
  })) : []

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Portfolio Activity</h1>
        <p className="text-white/70">
          Managed portfolio signals, liquidity flow, and risk-adjusted performance snapshots.
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
          <div className="text-xs text-white/60">Primary Strategy</div>
          <div className="text-lg font-semibold text-white mt-2">{activeStats?.strategy ?? 'Portfolio Balance'}</div>
        </div>
        <div
          className="p-4 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="text-xs text-white/60">Risk Profile</div>
          <div className="text-lg font-semibold text-white mt-2">{activeStats?.riskLevel ?? 'Balanced'}</div>
        </div>
        <div
          className="p-4 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="text-xs text-white/60">Active Plan</div>
          <div className="text-lg font-semibold text-white mt-2">{activePlan?.plan.name ?? 'No active plan'}</div>
        </div>
      </div>

      {activePlan ? (
        <TradingBotCharts priceSeries={priceSeries} pnlSeries={pnlSeries} volumeSeries={volumeSeries} />
      ) : (
        <EmptyState
          title="Activate a trading plan to view portfolio activity"
          description="Once your plan is active, portfolio performance and liquidity charts will appear here."
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
