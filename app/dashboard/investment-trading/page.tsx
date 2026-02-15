import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import TradingOverviewCharts from '@/components/trading/TradingOverviewCharts'
import TradingViewWidget from '@/components/trading/TradingViewWidget'
import TradingPlanCard from '@/components/trading/TradingPlanCard'
import TradingSectionObserver from '@/components/trading/TradingSectionObserver'
import { buildAllocationSeries, simulateTradingProgress } from '@/lib/trading'
import { logUserActivity } from '@/lib/user-activity'
import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import EmptyState from '@/components/ui/EmptyState'
import TradingLiveOverviewCards from '@/components/trading/TradingLiveOverviewCards'
import { translate, languageFromCurrency, type LanguageCode } from '@/lib/i18n'
import { getFxRates, isSupportedCurrency, type CurrencyCode } from '@/lib/forex'

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

  if (!user) {
    redirect('/sign-in')
  }

  const rates = await getFxRates()
  const preferredCurrency: CurrencyCode = isSupportedCurrency(user?.preferredCurrency || '')
    ? (user?.preferredCurrency as CurrencyCode)
    : 'USD'
  const preferredLanguage: LanguageCode = user?.preferredLanguage
    ? (user?.preferredLanguage as LanguageCode)
    : languageFromCurrency(preferredCurrency)
  const t = (key: string) => translate(key, preferredLanguage)

  const tradingPlans = await prisma.tradingPlan.findMany({
    where: { status: 'active' },
    orderBy: { minInvestmentUsd: 'asc' },
  })

  const activePlan = user?.tradingPlans.find(plan => ['active', 'completed'].includes(plan.status)) ?? null
  const pendingPlan = user?.tradingPlans.find(plan => plan.status === 'awaiting_payment') ?? null
  const selectedPlan = user?.tradingPlans.find(plan => plan.status === 'selected') ?? null
  const activeStats = activePlan
    ? user?.tradingStats.find(stat => stat.tradingUserPlanId === activePlan.id && stat.isActive) ?? null
    : null
  const activeEarnings = activePlan
    ? user?.tradingEarnings.find(earning => earning.tradingUserPlanId === activePlan.id && earning.isActive) ?? null
    : null
  const now = new Date()

  let snapshot = null as null | {
    progress: number
    earnedUsd: number
    equityUsd: number
    pnlUsd: number
    dailyEstimateUsd: number
    winRate: number
    openPositions: number
  }

  const liveSeed = activePlan ? user.id * 13 + activePlan.id * 7 : user.id * 13

  if (activePlan) {
    const startDate = activePlan.startDate ?? activePlan.createdAt ?? now
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

    const isCompleted = now.getTime() >= endDate.getTime() || snapshot.progress >= 1

    if (activePlan.status === 'active' && isCompleted) {
      await prisma.tradingUserPlan.update({
        where: { id: activePlan.id },
        data: { status: 'completed', endDate },
      })

      await prisma.tradingStat.updateMany({
        where: { tradingUserPlanId: activePlan.id },
        data: { isActive: false },
      })

      await prisma.tradingEarning.updateMany({
        where: { tradingUserPlanId: activePlan.id },
        data: { isActive: true },
      })

      const hasActiveMining = await prisma.userPlan.count({
        where: { userId: user?.id ?? 0, status: 'active' },
      })
      const hasActiveTrading = await prisma.tradingUserPlan.count({
        where: { userId: user?.id ?? 0, status: 'active' },
      })
      if (hasActiveMining === 0 && hasActiveTrading === 0 && user?.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { accountStatus: 'inactive' },
        })
      }

      if (user?.id) {
        await logUserActivity({
          userId: user.id,
          action: 'TradingPlanCompleted',
          detail: 'Trading plan completed. Funds are now available for withdrawal.',
        })
      }
    }

    if (!activePlan.startDate || !activePlan.endDate) {
      await prisma.tradingUserPlan.update({
        where: { id: activePlan.id },
        data: {
          startDate,
          endDate,
        },
      })
    }

    if (activeEarnings && !activeEarnings.isAdminOverride && activePlan.status !== 'completed') {
      await prisma.tradingEarning.update({
        where: { id: activeEarnings.id },
        data: {
          totalEarnedUsd: snapshot.earnedUsd,
          dailyEstimateUsd: snapshot.dailyEstimateUsd,
          lastCalculatedAt: now,
        },
      })
    }

    if (activeStats && activePlan.status !== 'completed') {
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

  const allocationSeries = buildAllocationSeries((user?.id || 1) * 3)
  const performanceSeries = allocationSeries.map(item => ({
    label: item.name,
    value: Math.round(item.value * 0.9),
  }))
  const planLabel = activePlan?.plan.name ?? pendingPlan?.plan.name ?? selectedPlan?.plan.name ?? 'Not Active'
  const statusLabel = activePlan
    ? activePlan.status === 'completed'
      ? 'Completed'
      : 'Active'
    : pendingPlan
      ? 'Awaiting Payment'
      : selectedPlan
        ? 'Proof Not Submitted'
        : 'Inactive'

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8">
      <TradingSectionObserver />
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{t('tradingTitle')}</h1>
          <p className="text-white/70 max-w-2xl">
            {t('tradingOverviewSubtitle')}
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
          {t('tradingPortfolioButton')} <ArrowUpRight size={16} className="inline-block ml-2" />
        </Link>
      </div>

      {pendingPlan && (
        <div
          className="p-5 rounded-2xl text-white/80"
          style={{
            background: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
          }}
        >
          {t('tradingAwaitingPayment')}
          <div className="mt-3">
            <Link
              href="/dashboard/investment-trading/payment"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold"
              style={{
                background: 'linear-gradient(135deg, #582dff, #3a137a)',
                color: '#ffffff',
              }}
            >
              {t('viewPaymentInstructions')}
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {selectedPlan && !pendingPlan && (
        <div
          className="p-5 rounded-2xl text-white/80"
          style={{
            background: 'rgba(234, 179, 8, 0.1)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
          }}
        >
          Payment proof has not been submitted yet. Upload proof to start verification.
          <div className="mt-3">
            <Link
              href="/dashboard/investment-trading/payment"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold"
              style={{
                background: 'linear-gradient(135deg, #582dff, #3a137a)',
                color: '#ffffff',
              }}
            >
              Upload payment proof
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {activePlan ? (
        <TradingLiveOverviewCards
          planLabel={planLabel}
          statusLabel={statusLabel}
          investmentUsd={Number(activePlan.investmentUsd)}
          expectedReturnUsd={Number(activePlan.expectedReturnUsd)}
          durationHours={activePlan.durationHours}
          startDateIso={activePlan.startDate?.toISOString() ?? activePlan.createdAt.toISOString()}
          seed={liveSeed}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div
            className="p-4 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
            }}
          >
            <div className="text-xs text-white/60">Current Plan</div>
            <div className="text-lg font-semibold text-white mt-2">{planLabel}</div>
            <div className="text-xs text-white/50 mt-1">{statusLabel}</div>
          </div>
        </div>
      )}

      {activePlan ? (
        <TradingOverviewCharts
          investmentUsd={Number(activePlan.investmentUsd)}
          expectedReturnUsd={Number(activePlan.expectedReturnUsd)}
          durationHours={activePlan.durationHours}
          startDateIso={activePlan.startDate?.toISOString() ?? activePlan.createdAt.toISOString()}
          seed={liveSeed}
          allocationSeries={allocationSeries}
          performanceSeries={performanceSeries}
        />
      ) : (
        <EmptyState
          title={t('tradingEmptyTitle')}
          description={t('tradingEmptyDescription')}
          action={
            <Link
              href="/dashboard/investment-trading#plans"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #582dff, #3a137a)',
                color: '#ffffff',
              }}
            >
              {t('viewTradingPlans')}
              <ArrowUpRight size={14} />
            </Link>
          }
        />
      )}

      <div
        className="w-full rounded-3xl p-4 md:p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        <div className="text-lg md:text-xl font-semibold text-white mb-4">Current Market Data</div>
        <TradingViewWidget />
      </div>

      <section id="plans" className="space-y-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white">{t('tradingPlansTitle')}</h2>
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
