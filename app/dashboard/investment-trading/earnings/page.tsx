import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import TradingEarningsCharts from '@/components/trading/TradingEarningsCharts'
import TradingLiveEarningsCards from '@/components/trading/TradingLiveEarningsCards'
import { buildTradingSeries, simulateTradingProgress } from '@/lib/trading'
import { translate, languageFromCurrency, type LanguageCode } from '@/lib/i18n'
import { getFxRates, isSupportedCurrency, type CurrencyCode } from '@/lib/forex'
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

  const rates = await getFxRates()
  const preferredCurrency: CurrencyCode = isSupportedCurrency(user?.preferredCurrency || '')
    ? (user?.preferredCurrency as CurrencyCode)
    : 'USD'
  const preferredLanguage: LanguageCode = user?.preferredLanguage
    ? (user?.preferredLanguage as LanguageCode)
    : languageFromCurrency(preferredCurrency)
  const t = (key: string) => translate(key, preferredLanguage)

  let snapshot = null as null | { dailyEstimateUsd: number; earnedUsd: number }
  if (activePlan) {
    const startDate = activePlan.startDate ?? activePlan.createdAt ?? now
    const endDate = activePlan.endDate ?? new Date(startDate.getTime() + activePlan.durationHours * 60 * 60 * 1000)
    const seed = (user?.id || 1) * 13 + activePlan.id * 7
    snapshot = simulateTradingProgress({
      investmentUsd: Number(activePlan.investmentUsd),
      expectedReturnUsd: Number(activePlan.expectedReturnUsd),
      durationHours: activePlan.durationHours,
      startDate,
      now,
      seed,
    })

    if (!activePlan.startDate || !activePlan.endDate) {
      await prisma.tradingUserPlan.update({
        where: { id: activePlan.id },
        data: {
          startDate,
          endDate,
        },
      })
    }

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

  const isActive = Boolean(activePlan)
  const displayTotalEarned = isActive
    ? (snapshot ? snapshot.earnedUsd : (activeEarning ? Number(activeEarning.totalEarnedUsd) : 0))
    : 0
  const displayDailyEstimate = isActive
    ? (snapshot ? snapshot.dailyEstimateUsd : (activeEarning ? Number(activeEarning.dailyEstimateUsd) : 0))
    : 0

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{t('tradingEarningsTitle')}</h1>
        <p className="text-white/70">Track trading profit, estimates, and momentum.</p>
      </div>

      {activePlan ? (
        <TradingLiveEarningsCards
          investmentUsd={Number(activePlan.investmentUsd)}
          expectedReturnUsd={Number(activePlan.expectedReturnUsd)}
          durationHours={activePlan.durationHours}
          startDateIso={activePlan.startDate?.toISOString() ?? activePlan.createdAt.toISOString()}
          seed={(user?.id || 1) * 13}
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

      {activePlan && (
        <TradingEarningsCharts
          investmentUsd={Number(activePlan.investmentUsd)}
          expectedReturnUsd={Number(activePlan.expectedReturnUsd)}
          durationHours={activePlan.durationHours}
          startDateIso={activePlan.startDate?.toISOString() ?? activePlan.createdAt.toISOString()}
          seed={(user?.id || 1) * 19}
        />
      )}
    </div>
  )
}
