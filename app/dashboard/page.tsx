import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Gem, Pickaxe, DollarSign, Settings, TrendingUp } from 'lucide-react'
import { autoUpdateEarnings } from '@/lib/earnings'
import OverviewAnalytics from '@/components/dashboard/OverviewAnalytics'

import TickerTape from '@/components/dashboard/TickerTape'
import AdvancedChart from '@/components/dashboard/AdvancedChart'
import NewsTimeline from '@/components/dashboard/NewsTimeline'

export default async function DashboardPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      userPlans: {
        where: {
          status: { in: ['active', 'awaiting_payment'] },
        },
        include: {
          plan: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      },
      earnings: {
        where: { isActive: true },
        include: {
          userPlan: {
            include: {
              plan: true,
              multiAssetAllocations: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      miningStats: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  const tradingEarnings = user ? await prisma.tradingEarning.findMany({
    where: { userId: user.id, isActive: true },
    orderBy: { createdAt: 'desc' },
  }) : []

  const currentPlan = user?.userPlans[0]
  const activeMining = user?.miningStats?.find(stat => stat.isActive) ?? user?.miningStats?.[0] ?? null
  const now = new Date()

  const updatedEarnings = user
    ? await autoUpdateEarnings({
        userId: user.id,
        earnings: user.earnings,
        miningStats: activeMining
          ? {
              assignedHashrate: activeMining.assignedHashrate,
              hashrateUnit: activeMining.hashrateUnit,
              isActive: activeMining.isActive,
            }
          : null,
        now,
      })
    : []

  const totalEarnedUsd = updatedEarnings.reduce((sum, record) => sum + Number(record.totalEarnedUsd || 0), 0)
  const pendingReleaseUsd = updatedEarnings.reduce(
    (sum, record) => sum + (record.isWithdrawable ? 0 : Number(record.totalEarnedUsd || 0)),
    0
  )
  const estimatedDailyUsd = updatedEarnings.reduce(
    (sum, record) => sum + (record.isHistorical ? 0 : Number(record.dailyEstimateUsd || 0)),
    0
  )
  const tradingTotalUsd = tradingEarnings
    ? tradingEarnings.reduce((sum, record) => sum + Number(record.totalEarnedUsd || 0), 0)
    : 0
  const daysActiveStart = currentPlan?.startDate ?? activeMining?.createdAt ?? currentPlan?.createdAt ?? null
  const daysActive =
    user?.accountStatus === 'active' && daysActiveStart
      ? Math.max(1, Math.floor((now.getTime() - new Date(daysActiveStart).getTime()) / (1000 * 60 * 60 * 24)) + 1)
      : 0
  const actualDailyUsd = daysActive > 0 ? totalEarnedUsd / daysActive : 0

  const earningsSeries = Array.from({ length: 24 }, (_, index) => {
    const hoursAgo = 23 - index
    const value = Math.max(0, totalEarnedUsd - (estimatedDailyUsd / 24) * hoursAgo)
    return { time: `${new Date(now.getTime() - hoursAgo * 3600 * 1000).getHours()}:00`, value: Math.round(value * 100) / 100 }
  })

  const hashrateBase = activeMining ? Number(activeMining.assignedHashrate) : 0
  const hashrateSeries = Array.from({ length: 24 }, (_, index) => {
    const hoursAgo = 23 - index
    const seed = (user?.id || 1) * 97 + hoursAgo * 13
    const noise = Math.sin(seed) * 0.04
    const value = Math.max(0, hashrateBase * (0.96 + noise))
    return { time: `${new Date(now.getTime() - hoursAgo * 3600 * 1000).getHours()}:00`, value: Math.round(value * 100) / 100 }
  })

  const totalShares = activeMining ? Number(activeMining.lastCounterValue || 0) : 0
  const avgDailyShares = daysActive > 0 ? totalShares / daysActive : 0
  const sharesSeries = Array.from({ length: Math.min(7, daysActive || 1) }, (_, index) => {
    const dayOffset = Math.min(6, (daysActive - 1) - index)
    const day = new Date(now.getTime() - dayOffset * 24 * 3600 * 1000)
    return {
      day: day.toLocaleDateString('en-US', { weekday: 'short' }),
      value: Math.round(avgDailyShares),
    }
  })

  const estimatedVsActual = [
    { label: 'Daily', estimated: Math.round(estimatedDailyUsd * 100) / 100, actual: Math.round(actualDailyUsd * 100) / 100 },
  ]

  return (
    <div className="w-full">
      {/* Sticky Ticker Tape (must remain inside Overview content) */}
      <TickerTape />

      {/* All other content gets the page padding (so ticker has no gap and spans full width) */}
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Welcome back, {user?.fullName || 'there'}! 👋
          </h1>
          <p className="text-sm md:text-base text-white/70">
            Here is an overview of your mining account
          </p>
        </div>

        {/* Account Status Card */}
        <div
          className="p-4 md:p-6 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <h2 className="text-lg md:text-xl font-semibold text-white mb-4">Account Status</h2>

          {user?.accountStatus === 'inactive' && (
            <div className="space-y-4">
              <p className="text-sm md:text-base text-white/80">
                Your account is ready! Get started by selecting a mining plan.
              </p>
              <Link
                href="/dashboard/plans"
                className="inline-block px-4 md:px-6 py-2 md:py-3 rounded-full font-semibold transition-all text-sm md:text-base"
                style={{
                  background: 'linear-gradient(135deg, #582dff, #3a137a)',
                  color: '#ffffff',
                }}
              >
                View Mining Plans →
              </Link>
            </div>
          )}

          {user?.accountStatus === 'pending' && (
            <div className="space-y-4">
              <p className="text-sm md:text-base text-white/80">
                Your payment is being processed. You will be notified once your mining plan is activated.
              </p>
              <Link
                href="/dashboard/payment"
                className="text-sm md:text-base text-purple-300 hover:text-purple-200 underline"
              >
                View payment instructions →
              </Link>
            </div>
          )}

          {user?.accountStatus === 'active' && currentPlan && (
            <div className="grid grid-cols-2 gap-4 md:gap-6">
              <div>
                <div className="text-xs md:text-sm text-white/60 mb-1">Current Plan</div>
                <div className="text-lg md:text-2xl font-bold text-white">{currentPlan.plan.name}</div>
              </div>
              <div>
                <div className="text-xs md:text-sm text-white/60 mb-1">Hashrate</div>
                <div className="text-lg md:text-2xl font-bold text-white">
                  {currentPlan.plan.baseHashrate.toString()} {currentPlan.plan.hashrateUnit}
                </div>
              </div>
              <div>
                <div className="text-xs md:text-sm text-white/60 mb-1">Duration</div>
                <div className="text-base md:text-lg font-semibold text-white">
                  {currentPlan.selectedDurationDays} days
                </div>
              </div>
              <div>
                <div className="text-xs md:text-sm text-white/60 mb-1">Status</div>
                <div className="text-base md:text-lg font-semibold text-green-400">
                  {activeMining?.isActive ? 'Mining Active' : 'Mining Paused'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
          <div
            className="p-4 md:p-6 rounded-3xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
            }}
          >
            <div className="text-xs md:text-sm text-white/60 mb-2">Total Hashrate</div>
            <div className="text-lg md:text-2xl font-bold text-white">
              {user?.accountStatus === 'active' && currentPlan
                ? `${currentPlan.plan.baseHashrate.toString()} ${currentPlan.plan.hashrateUnit}`
                : '0 TH/s'}
            </div>
          </div>

          <div
            className="p-4 md:p-6 rounded-3xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
            }}
          >
            <div className="text-xs md:text-sm text-white/60 mb-2">Total Earned</div>
            <div className="text-lg md:text-2xl font-bold text-white">
              ${totalEarnedUsd.toFixed(2)}
            </div>
            {pendingReleaseUsd > 0 && (
              <div className="text-xs text-blue-200 mt-2">
                Pending system release: ${pendingReleaseUsd.toFixed(2)}
              </div>
            )}
          </div>

          <div
            className="p-4 md:p-6 rounded-3xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
            }}
          >
            <div className="text-xs md:text-sm text-white/60 mb-2">Trading Earned</div>
            <div className="text-lg md:text-2xl font-bold text-white">
              ${tradingTotalUsd.toFixed(2)}
            </div>
          </div>

          <div
            className="p-4 md:p-6 rounded-3xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
            }}
          >
            <div className="text-xs md:text-sm text-white/60 mb-2">Days Active</div>
            <div className="text-lg md:text-2xl font-bold text-white">
              {daysActive}
            </div>
          </div>

          <div
            className="p-4 md:p-6 rounded-3xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
            }}
          >
            <div className="text-xs md:text-sm text-white/60 mb-2">Network Status</div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <div className="text-base md:text-xl font-bold text-white">Online</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div
          className="p-4 md:p-6 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <h2 className="text-lg md:text-xl font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Link
              href="/dashboard/plans"
              className="p-4 rounded-2xl text-center transition-all hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.03))',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <div className="mb-2 flex justify-center">
                <Gem size={28} className="text-white float-soft" />
              </div>
              <div className="text-xs md:text-sm text-white/80">View Plans</div>
            </Link>
            <Link
              href="/dashboard/mining"
              className="p-4 rounded-2xl text-center transition-all hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.03))',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <div className="mb-2 flex justify-center">
                <Pickaxe size={28} className="text-white float-soft" />
              </div>
              <div className="text-xs md:text-sm text-white/80">Mining</div>
            </Link>
            <Link
              href="/dashboard/investment-trading"
              className="p-4 rounded-2xl text-center transition-all hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.03))',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <div className="mb-2 flex justify-center">
                <TrendingUp size={28} className="text-white float-soft" />
              </div>
              <div className="text-xs md:text-sm text-white/80">Trading</div>
            </Link>
            <Link
              href="/dashboard/earnings"
              className="p-4 rounded-2xl text-center transition-all hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.03))',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <div className="mb-2 flex justify-center">
                <DollarSign size={28} className="text-white float-soft" />
              </div>
              <div className="text-xs md:text-sm text-white/80">Earnings</div>
            </Link>
            <Link
              href="/dashboard/settings"
              className="p-4 rounded-2xl text-center transition-all hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.03))',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <div className="mb-2 flex justify-center">
                <Settings size={28} className="text-white float-soft" />
              </div>
              <div className="text-xs md:text-sm text-white/80">Settings</div>
            </Link>
          </div>
        </div>

        {/* Market Overview Section */}
        <div className="space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold text-white">Market Overview</h2>

          <div className="flex flex-col gap-6">
            <div className="w-full h-[600px]">
              <AdvancedChart />
            </div>

            <div className="w-full h-[600px]">
              <NewsTimeline />
            </div>
          </div>
        </div>

        <OverviewAnalytics
          earningsSeries={earningsSeries}
          hashrateSeries={hashrateSeries}
          sharesSeries={sharesSeries}
          estimatedVsActual={estimatedVsActual}
        />
      </div>
    </div>
  )
}





