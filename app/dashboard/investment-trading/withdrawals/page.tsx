import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import TradingWithdrawalsCharts from '@/components/trading/TradingWithdrawalsCharts'
import TradingWithdrawalForm from '@/components/trading/TradingWithdrawalForm'
import EmptyState from '@/components/ui/EmptyState'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { getFxRates, isSupportedCurrency, type CurrencyCode, convertUsd, formatCurrency } from '@/lib/forex'
import { translate, languageFromCurrency, type LanguageCode } from '@/lib/i18n'
import { logUserActivity } from '@/lib/user-activity'
import { simulateTradingProgress } from '@/lib/trading'

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

  if (!user) {
    redirect('/sign-in')
  }

  const eligiblePlans = user?.tradingPlans.filter(plan => ['active', 'completed'].includes(plan.status)) ?? []
  const eligiblePlanIds = new Set(eligiblePlans.map(plan => plan.id))
  const activePlan = eligiblePlans[0] ?? null
  const activeEarning = activePlan
    ? (user?.tradingEarnings.find(
        earning => earning.tradingUserPlanId === activePlan.id && earning.isActive
      ) ??
      user?.tradingEarnings.find(earning => earning.tradingUserPlanId === activePlan.id) ??
      null)
    : null
  const now = new Date()
  const liveSeed = activePlan ? (user?.id || 1) * 13 + activePlan.id * 7 : (user?.id || 1) * 13
  let activePlanLiveEarned = activeEarning ? Number(activeEarning.totalEarnedUsd) : 0
  if (activePlan) {
    const startDate = activePlan.startDate ?? activePlan.createdAt ?? now
    const endDate = activePlan.endDate ?? new Date(startDate.getTime() + activePlan.durationHours * 60 * 60 * 1000)
    const isCompletedByTime = now.getTime() >= endDate.getTime()

    if (activePlan.status === 'active' && isCompletedByTime) {
      await prisma.tradingUserPlan.update({
        where: { id: activePlan.id },
        data: { status: 'completed', endDate },
      })

      await prisma.tradingStat.updateMany({
        where: { tradingUserPlanId: activePlan.id },
        data: { isActive: false },
      })

      await logUserActivity({
        userId: user.id,
        action: 'TradingPlanCompleted',
        detail: 'Trading plan completed. Funds are now available for withdrawal.',
      })
    }
  }

  if (activePlan && activeEarning && !activeEarning.isAdminOverride) {
    const startDate = activePlan.startDate ?? activePlan.createdAt ?? now
    const snapshot = simulateTradingProgress({
      investmentUsd: Number(activePlan.investmentUsd),
      expectedReturnUsd: Number(activePlan.expectedReturnUsd),
      durationHours: activePlan.durationHours,
      startDate,
      now,
      seed: liveSeed,
    })
    activePlanLiveEarned = snapshot.earnedUsd
    await prisma.tradingEarning.update({
      where: { id: activeEarning.id },
      data: {
        totalEarnedUsd: snapshot.earnedUsd,
        dailyEstimateUsd: snapshot.dailyEstimateUsd,
        lastCalculatedAt: now,
      },
    })
  }
  const historicalEarned = user?.tradingEarnings
    .filter(earning => eligiblePlanIds.has(earning.tradingUserPlanId))
    .reduce((sum, earning) => sum + Number(earning.totalEarnedUsd), 0) ?? 0
  const totalEarned =
    activeEarning && !activeEarning.isAdminOverride
      ? historicalEarned - Number(activeEarning.totalEarnedUsd) + activePlanLiveEarned
      : historicalEarned

  const totalWithdrawn = user?.tradingWithdrawals
    .filter(
      w =>
        w.status !== 'rejected' &&
        (w.tradingUserPlanId ? eligiblePlanIds.has(w.tradingUserPlanId) : true)
    )
    .reduce((sum, w) => sum + Number(w.amountUsd), 0) ?? 0
  const availableUsd = Math.max(0, totalEarned - totalWithdrawn)
  const baseMinWithdrawalUsd = Math.min(100, Math.max(20, totalEarned * 0.05))
  const minWithdrawalUsd =
    availableUsd > 0 ? Math.max(1, Math.min(baseMinWithdrawalUsd, availableUsd)) : baseMinWithdrawalUsd
  const rates = await getFxRates()
  const preferredCurrency: CurrencyCode = isSupportedCurrency(user?.preferredCurrency || '')
    ? (user?.preferredCurrency as CurrencyCode)
    : 'USD'
  const preferredLanguage: LanguageCode = user?.preferredLanguage
    ? (user?.preferredLanguage as LanguageCode)
    : languageFromCurrency(preferredCurrency)
  const t = (key: string) => translate(key, preferredLanguage)
  const formatMoney = (amountUsd: number) =>
    formatCurrency(convertUsd(amountUsd, rates, preferredCurrency), preferredCurrency)

  const historySeries = user?.tradingWithdrawals.slice(0, 8).map(withdrawal => ({
    time: new Date(withdrawal.requestedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: Number(withdrawal.amountUsd),
  })) ?? []

  const statusCounts = user?.tradingWithdrawals.reduce((acc: Record<string, number>, withdrawal) => {
    acc[withdrawal.status] = (acc[withdrawal.status] || 0) + 1
    return acc
  }, {} as Record<string, number>) ?? {}

  const statusSeries = Object.entries(statusCounts).map(([name, value]) => ({ name, value: Number(value) }))

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
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{t('tradingWithdrawalsTitle')}</h1>
        <p className="text-white/70">Request withdrawals from trading earnings to your account balance.</p>
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
              <div className="text-2xl font-semibold text-white truncate" title={formatMoney(availableUsd)}>
                {formatMoney(availableUsd)}
              </div>
              <div className="text-xs text-white/50">{t('minWithdrawalLabel')}: {formatMoney(minWithdrawalUsd)}</div>
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
          title={t('tradingWithdrawalsEmptyTitle')}
          description={t('tradingWithdrawalsEmptyDescription')}
          action={
            <Link
              href="/dashboard/investment-trading#plans"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #582dff, #3a137a)',
                color: '#ffffff',
              }}
            >
              {t('activatePlan')}
              <ArrowUpRight size={14} />
            </Link>
          }
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
        <h2 className="text-white font-semibold text-lg mb-4">{t('recentRequestsTitle')}</h2>
        {user?.tradingWithdrawals.length ? (
          <div className="space-y-3 text-sm">
            {user.tradingWithdrawals.slice(0, 8).map(withdrawal => (
              <div key={withdrawal.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="text-white font-semibold">{formatMoney(Number(withdrawal.amountUsd))}</div>
                <div className="text-white/60">{withdrawal.walletAddress || 'Account Balance'}</div>
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
