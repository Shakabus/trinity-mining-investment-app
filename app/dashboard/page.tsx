import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Gem, Pickaxe, DollarSign, Settings, TrendingUp } from 'lucide-react'
import { autoUpdateEarnings } from '@/lib/earnings'
import { simulateTradingProgress } from '@/lib/trading'
import { getRealEstateDashboardData } from '@/lib/real-estate-dashboard'
import {
  formatAccountBalanceSource,
  getAccountBalanceEntries,
  getAccountBalanceSummary,
} from '@/lib/account-balance'
import OverviewAnalytics from '@/components/dashboard/OverviewAnalytics'
import { convertUsd, formatCurrency, getFxRates, isSupportedCurrency, type CurrencyCode } from '@/lib/forex'
import type { TradingEarning } from '@prisma/client'
import LanguageToggle from '@/components/dashboard/LanguageToggle'
import { translate, languageFromCurrency, type LanguageCode } from '@/lib/i18n'

import TickerTape from '@/components/dashboard/TickerTape'
import AdvancedChart from '@/components/dashboard/AdvancedChart'
import NewsTimeline from '@/components/dashboard/NewsTimeline'
import DashboardAutoRefresh from '@/components/dashboard/DashboardAutoRefresh'
import LivePaymentsPageClient from '@/components/marketing/LivePaymentsPageClient'

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
          status: { in: ['active', 'awaiting_payment', 'selected'] },
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
      tradingPlans: {
        where: {
          status: { in: ['active', 'awaiting_payment', 'selected'] },
        },
        include: {
          plan: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      },
      withdrawals: {
        select: {
          amountUsd: true,
          status: true,
        },
      },
      tradingWithdrawals: {
        select: {
          amountUsd: true,
          status: true,
        },
      },
      referralBonuses: {
        select: {
          amountUsd: true,
          status: true,
        },
      },
      referralWithdrawals: {
        select: {
          amountUsd: true,
          status: true,
        },
      },
    },
  })

  const tradingEarnings = user ? await prisma.tradingEarning.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  }) : []

  const currentPlan = user?.userPlans[0]
  const tradingPlan = user?.tradingPlans?.[0] ?? null
  const activeMiningPlan = user
    ? await prisma.userPlan.findFirst({
        where: { userId: user.id, status: 'active' },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      })
    : null
  const activeTradingPlan = user
    ? await prisma.tradingUserPlan.findFirst({
        where: { userId: user.id, status: 'active' },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      })
    : null
  const hasMiningSelected = currentPlan?.status === 'selected'
  const hasTradingSelected = tradingPlan?.status === 'selected'
  const activeMining = user?.miningStats?.find(stat => stat.isActive) ?? user?.miningStats?.[0] ?? null
  const now = new Date()
  const activeTradingEarning = activeTradingPlan
    ? (tradingEarnings.find(
        earning => earning.tradingUserPlanId === activeTradingPlan.id && earning.isActive
      ) ??
      tradingEarnings.find(earning => earning.tradingUserPlanId === activeTradingPlan.id) ??
      null)
    : null

  const rates = await getFxRates()
  const preferredCurrency: CurrencyCode = isSupportedCurrency(user?.preferredCurrency || '')
    ? (user?.preferredCurrency as CurrencyCode)
    : 'USD'
  const formatMoney = (amountUsd: number) =>
    formatCurrency(convertUsd(amountUsd, rates, preferredCurrency), preferredCurrency)
  const preferredLanguage: LanguageCode = user?.preferredLanguage
    ? (user.preferredLanguage as LanguageCode)
    : languageFromCurrency(preferredCurrency)
  const t = (key: string) => translate(key, preferredLanguage)

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

  const miningEarnedUsd = updatedEarnings.reduce((sum, record) => sum + Number(record.totalEarnedUsd || 0), 0)
  const pendingReleaseUsd = updatedEarnings.reduce(
    (sum, record) => sum + (record.isWithdrawable ? 0 : Number(record.totalEarnedUsd || 0)),
    0
  )
  const estimatedDailyUsd = updatedEarnings.reduce(
    (sum, record) => sum + (record.isHistorical ? 0 : Number(record.dailyEstimateUsd || 0)),
    0
  )
  type TradingEarningComputed = Omit<TradingEarning, 'totalEarnedUsd' | 'dailyEstimateUsd'> & {
    totalEarnedUsd: number
    dailyEstimateUsd: number
  }
  let tradingEarningsComputed: TradingEarningComputed[] = tradingEarnings.map(record => ({
    ...record,
    totalEarnedUsd: Number(record.totalEarnedUsd || 0),
    dailyEstimateUsd: Number(record.dailyEstimateUsd || 0),
  }))
  if (user && activeTradingPlan && activeTradingEarning && !activeTradingEarning.isAdminOverride) {
    const startDate = activeTradingPlan.startDate ?? activeTradingPlan.createdAt ?? now
    const seed = user.id * 13 + activeTradingPlan.id * 7
    const snapshot = simulateTradingProgress({
      investmentUsd: Number(activeTradingPlan.investmentUsd),
      expectedReturnUsd: Number(activeTradingPlan.expectedReturnUsd),
      durationHours: activeTradingPlan.durationHours,
      startDate,
      now,
      seed,
    })
    await prisma.tradingEarning.update({
      where: { id: activeTradingEarning.id },
      data: {
        totalEarnedUsd: snapshot.earnedUsd,
        dailyEstimateUsd: snapshot.dailyEstimateUsd,
        lastCalculatedAt: now,
      },
    })
    tradingEarningsComputed = tradingEarningsComputed.map(record =>
      record.id === activeTradingEarning.id
        ? {
            ...record,
            totalEarnedUsd: snapshot.earnedUsd,
            dailyEstimateUsd: snapshot.dailyEstimateUsd,
          }
        : record
    )
  }

  const tradingTotalUsd = tradingEarningsComputed
    ? tradingEarningsComputed.reduce((sum, record) => sum + Number(record.totalEarnedUsd || 0), 0)
    : 0
  const realEstateData = await getRealEstateDashboardData(userId)
  const accountBalanceSummary = user
    ? await getAccountBalanceSummary(user.id)
    : {
        balanceUsd: 0,
        availableToSpendUsd: 0,
        pendingCreditsUsd: 0,
        pendingDebitsUsd: 0,
        totalCreditsUsd: 0,
        totalDebitsUsd: 0,
      }
  const accountBalanceEntries = user ? await getAccountBalanceEntries(user.id, { limit: 800 }) : []

  const latestEntriesByReference = accountBalanceEntries.reduce<Map<string, (typeof accountBalanceEntries)[number]>>(
    (map, entry) => {
      const key = `${entry.source}:${entry.direction}:${entry.referenceId}`
      const existing = map.get(key)
      if (!existing || existing.createdAt.getTime() < entry.createdAt.getTime()) {
        map.set(key, entry)
      }
      return map
    },
    new Map()
  )

  const latestAccountBalanceEntries = [...latestEntriesByReference.values()]

  const totalDepositedUsd = latestAccountBalanceEntries
    .filter(
      entry =>
        entry.direction === 'credit' &&
        entry.status === 'settled' &&
        ['funding_deposit', 'external_payment', 'external_trading_payment'].includes(entry.source)
    )
    .reduce((sum, entry) => sum + entry.amountUsd, 0)

  const totalInvestedUsd = latestAccountBalanceEntries
    .filter(
      entry =>
        entry.direction === 'debit' &&
        entry.status === 'settled' &&
        ['mining_plan_purchase', 'trading_plan_purchase'].includes(entry.source)
    )
    .reduce((sum, entry) => sum + entry.amountUsd, 0)

  const recentBalanceTransactions = latestAccountBalanceEntries
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5)
  const realEstateMonthlyRealizedUsd = realEstateData.summary.thisMonthRealizedUsd
  const totalEarnedUsd = miningEarnedUsd + tradingTotalUsd
  const totalEarnedOverviewUsd = totalEarnedUsd + realEstateMonthlyRealizedUsd
  const realEstateTotalAllocationUsd = realEstateData.summary.portfolioAllocationUsd
  const realEstateApprovedCount = realEstateData.summary.approvedCount
  const realEstatePendingCount = realEstateData.summary.pendingCount
  const completedMiningAvailable = updatedEarnings.some(
    record => record.isWithdrawable && record.userPlan?.status === 'completed'
  )
  const completedTradingPlan = user?.tradingPlans?.find(plan => plan.status === 'completed') ?? null
  const completedTradingAvailable = Boolean(completedTradingPlan && tradingEarnings.length > 0)
  const hasActivePlans = Boolean(activeMiningPlan || activeTradingPlan)
  const effectiveAccountStatus = hasActivePlans ? 'active' : (user?.accountStatus ?? 'inactive')
  const daysActiveDates = [
    activeMiningPlan?.startDate ?? activeMiningPlan?.createdAt ?? null,
    activeMining?.createdAt ?? null,
    activeTradingPlan?.startDate ?? activeTradingPlan?.createdAt ?? null,
  ].filter(Boolean) as Date[]
  const daysActiveStart = daysActiveDates.length
    ? new Date(Math.min(...daysActiveDates.map(date => date.getTime())))
    : null
  const daysActive =
    effectiveAccountStatus === 'active' && daysActiveStart
      ? Math.max(1, Math.floor((now.getTime() - new Date(daysActiveStart).getTime()) / (1000 * 60 * 60 * 24)) + 1)
      : 0
  const computeDailyRunRate = (totalUsd: number, startDate: Date | null | undefined, fallbackDate: Date | null | undefined) => {
    const startedAt = startDate ?? fallbackDate ?? now
    const elapsedDays = Math.max(1, Math.floor((now.getTime() - startedAt.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    return totalUsd / elapsedDays
  }

  const miningActualDailyUsd = updatedEarnings
    .filter(record => !record.isHistorical)
    .reduce((sum, record) => {
      const totalUsd = Number(record.totalEarnedUsd || 0)
      const startDate = record.userPlan?.startDate ?? null
      const fallbackDate = record.userPlan?.createdAt ?? null
      return sum + computeDailyRunRate(totalUsd, startDate, fallbackDate)
    }, 0)

  const tradingActualDailyUsd = tradingEarningsComputed
    .filter(record => record.isActive)
    .reduce((sum, record) => {
      const totalUsd = Number(record.totalEarnedUsd || 0)
      const startDate = activeTradingPlan?.startDate ?? null
      const fallbackDate = activeTradingPlan?.createdAt ?? record.createdAt ?? null
      return sum + computeDailyRunRate(totalUsd, startDate, fallbackDate)
    }, 0)

  const earningsSeries = Array.from({ length: 24 }, (_, index) => {
    const hoursAgo = 23 - index
    const combinedEstimatedDaily =
      estimatedDailyUsd +
      (tradingEarningsComputed.length > 0
        ? tradingEarningsComputed.reduce((sum, record) => sum + Number(record.dailyEstimateUsd || 0), 0)
        : 0)
    const value = Math.max(0, totalEarnedUsd - (combinedEstimatedDaily / 24) * hoursAgo)
    const converted = convertUsd(value, rates, preferredCurrency)
    return { time: `${new Date(now.getTime() - hoursAgo * 3600 * 1000).getHours()}:00`, value: Math.round(converted * 100) / 100 }
  })

  const hashrateBase = activeMining ? Number(activeMining.assignedHashrate) : 0
  const hashrateDisplay = activeMining
    ? `${Number(activeMining.assignedHashrate).toLocaleString()} ${activeMining.hashrateUnit}`
    : '0 TH/s'
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

  const combinedEstimatedDaily =
    estimatedDailyUsd +
    (tradingEarningsComputed.length > 0
      ? tradingEarningsComputed.reduce((sum, record) => sum + Number(record.dailyEstimateUsd || 0), 0)
      : 0)
  const combinedActualDaily = miningActualDailyUsd + tradingActualDailyUsd
  const convertedEstimatedDaily = convertUsd(combinedEstimatedDaily, rates, preferredCurrency)
  const convertedActualDaily = convertUsd(combinedActualDaily, rates, preferredCurrency)
  const estimatedVsActual = [
    {
      label: 'Daily',
      estimated: Math.round(convertedEstimatedDaily * 100) / 100,
      actual: Math.round(convertedActualDaily * 100) / 100,
    },
  ]

  return (
    <div className="w-full">
      <DashboardAutoRefresh intervalMs={60000} />
      {/* Sticky Ticker Tape (must remain inside Overview content) */}
      <TickerTape />

      {/* All other content gets the page padding (so ticker has no gap and spans full width) */}
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              {t('welcomeBack')}, {user?.fullName || 'there'}! 👋
            </h1>
            <p className="text-sm md:text-base text-white/70">
              {t('overviewSubtitle')}
            </p>
          </div>
          <LanguageToggle />
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">Account Balance</h2>
            <div
              className="text-3xl md:text-4xl font-semibold text-emerald-300 mt-2"
              title={formatMoney(accountBalanceSummary.availableToSpendUsd)}
            >
              {formatMoney(accountBalanceSummary.availableToSpendUsd)}
            </div>
            {accountBalanceSummary.pendingCreditsUsd > 0 && (
              <div className="text-xs text-emerald-100/80 mt-2">
                Pending credits: {formatMoney(accountBalanceSummary.pendingCreditsUsd)}
              </div>
            )}
            {accountBalanceSummary.pendingDebitsUsd > 0 && (
              <div className="text-xs text-amber-100/80 mt-1">
                Pending debits: {formatMoney(accountBalanceSummary.pendingDebitsUsd)}
              </div>
            )}
          </div>
          <Link
            href="/dashboard/account/fund"
            className="inline-block px-5 py-2.5 rounded-full font-semibold text-sm md:text-base"
            style={{
              background: 'linear-gradient(135deg, #10b981, #047857)',
              color: '#ffffff',
            }}
          >
            Fund Account
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div
            className="p-4 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.16), rgba(16, 185, 129, 0.05))',
              border: '1px solid rgba(16, 185, 129, 0.35)',
            }}
          >
            <div className="text-xs text-emerald-100/80 mb-1">Total Deposits</div>
            <div className="text-xl font-semibold text-emerald-200" title={formatMoney(totalDepositedUsd)}>
              {formatMoney(totalDepositedUsd)}
            </div>
          </div>
          <div
            className="p-4 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(88, 45, 255, 0.16), rgba(88, 45, 255, 0.05))',
              border: '1px solid rgba(88, 45, 255, 0.35)',
            }}
          >
            <div className="text-xs text-violet-100/80 mb-1">Total Invested</div>
            <div className="text-xl font-semibold text-violet-200" title={formatMoney(totalInvestedUsd)}>
              {formatMoney(totalInvestedUsd)}
            </div>
          </div>
          <div
            className="p-4 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.03))',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <div className="text-xs text-white/70 mb-1">Last 5 Account Transactions</div>
            <div className="space-y-2">
              {recentBalanceTransactions.length > 0 ? (
                recentBalanceTransactions.map(entry => (
                  <div key={entry.id} className="flex items-start justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="truncate text-white/75">{formatAccountBalanceSource(entry.source)}</div>
                      <div className="text-[11px] text-white/45">
                        {entry.createdAt.toLocaleDateString()} • {entry.status}
                      </div>
                    </div>
                    <span className={`shrink-0 ${entry.direction === 'credit' ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {entry.direction === 'credit' ? '+' : '-'}
                      {formatMoney(entry.amountUsd)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-white/50">No account transactions yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* Account Status Card */}
        <div
          className="p-4 md:p-6 rounded-3xl min-w-0"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <h2 className="text-lg md:text-xl font-semibold text-white mb-4">{t('accountStatus')}</h2>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1 min-w-0 space-y-4">
            {effectiveAccountStatus === 'inactive' && !hasActivePlans && (
            <div className="space-y-4">
              <p className="text-sm md:text-base text-white/80">{t('accountReadyMessage')}</p>
              <Link
                href="/dashboard/plans"
                className="inline-block px-4 md:px-6 py-2 md:py-3 rounded-full font-semibold transition-all text-sm md:text-base"
                style={{
                  background: 'linear-gradient(135deg, #582dff, #3a137a)',
                  color: '#ffffff',
                }}
              >
                {t('viewMiningPlans')} →
              </Link>
            </div>
          )}

          {!hasActivePlans && user?.accountStatus === 'pending' && (
            <div className="space-y-4">
              <p className="text-sm md:text-base text-white/80">
                {t('paymentProcessingMessage')}
              </p>
              <Link
                href="/dashboard/payment"
                className="text-sm md:text-base text-purple-300 hover:text-purple-200 underline"
              >
                {t('viewPaymentInstructions')} →
              </Link>
            </div>
          )}
            </div>

          {(hasMiningSelected || hasTradingSelected) && user?.accountStatus !== 'pending' && (
            <div className="w-full lg:w-80 xl:w-96 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {hasMiningSelected && (
                  <span
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{
                      background: 'rgba(234, 179, 8, 0.18)',
                      border: '1px solid rgba(234, 179, 8, 0.4)',
                      color: '#fde047',
                    }}
                  >
                    {t('proofNotSubmittedMining')}
                  </span>
                )}
                {hasTradingSelected && (
                  <span
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{
                      background: 'rgba(234, 179, 8, 0.18)',
                      border: '1px solid rgba(234, 179, 8, 0.4)',
                      color: '#fde047',
                    }}
                  >
                    {t('proofNotSubmittedTrading')}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {hasMiningSelected && (
                  <Link
                    href="/dashboard/payment?verify=1"
                    className="inline-block px-4 md:px-6 py-2 md:py-3 rounded-full font-semibold transition-all text-sm md:text-base"
                    style={{
                      background: 'linear-gradient(135deg, #582dff, #3a137a)',
                      color: '#ffffff',
                    }}
                  >
                    {t('uploadMiningProof')} {'>'}
                  </Link>
                )}
                {hasTradingSelected && (
                  <Link
                    href="/dashboard/investment-trading/payment"
                    className="inline-block px-4 md:px-6 py-2 md:py-3 rounded-full font-semibold transition-all text-sm md:text-base"
                    style={{
                      background: 'linear-gradient(135deg, #582dff, #3a137a)',
                      color: '#ffffff',
                    }}
                  >
                    {t('uploadTradingProof')} {'>'}
                  </Link>
                )}
              </div>
            </div>
          )}

          </div>

          {(completedMiningAvailable || completedTradingAvailable) && (
            <div
              className="p-4 rounded-2xl mt-4"
              style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
              }}
            >
              <div className="text-sm text-emerald-100">
                Completed plans are ready for withdrawal.
                {!hasActivePlans && (
                  <span className="text-emerald-200/80"> Account is inactive until a new plan starts.</span>
                )}
              </div>
              <div className="flex flex-wrap gap-3 mt-3">
                {completedMiningAvailable && (
                  <Link
                    href="/dashboard/earnings"
                    className="inline-block px-4 py-2 rounded-full text-sm font-semibold"
                    style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      color: '#d1fae5',
                    }}
                  >
                    Request Mining Withdrawal {'>'}
                  </Link>
                )}
                {completedTradingAvailable && (
                  <Link
                    href="/dashboard/investment-trading/withdrawals"
                    className="inline-block px-4 py-2 rounded-full text-sm font-semibold"
                    style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      color: '#d1fae5',
                    }}
                  >
                    Request Trading Withdrawal {'>'}
                  </Link>
                )}
              </div>
            </div>
          )}

          {(activeMiningPlan || activeTradingPlan) && (
            <div className="grid grid-cols-2 gap-4 md:gap-6">
              <div>
                <div className="text-xs md:text-sm text-white/60 mb-1">Active Plans</div>
                <div className="text-base md:text-lg font-semibold text-white">
                  {activeMiningPlan && activeTradingPlan
                    ? `Mining: ${activeMiningPlan.plan.name} · Trading: ${activeTradingPlan.plan.name}`
                    : activeMiningPlan
                      ? `Mining: ${activeMiningPlan.plan.name}`
                      : `Trading: ${activeTradingPlan?.plan.name ?? 'N/A'}`}
                </div>
              </div>
              <div>
                <div className="text-xs md:text-sm text-white/60 mb-1">Account Status</div>
                <div className="text-base md:text-lg font-semibold text-green-400">
                  {activeMiningPlan && activeTradingPlan
                    ? 'Mining + Trading Active'
                    : activeMiningPlan
                      ? 'Mining Active'
                      : 'Trading Active'}
                </div>
              </div>
              {activeMiningPlan && (
                <>
                  <div>
                    <div className="text-xs md:text-sm text-white/60 mb-1">Hashrate</div>
                    <div className="text-lg md:text-2xl font-bold text-white">
                      {hashrateDisplay}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs md:text-sm text-white/60 mb-1">Duration</div>
                    <div className="text-base md:text-lg font-semibold text-white">
                      {activeMiningPlan.selectedDurationDays} days
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4">
          <div
            className="p-4 md:p-6 rounded-3xl min-w-0"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
            }}
          >
            <div className="text-xs md:text-sm text-white/60 mb-2">Total Hashrate</div>
            <div className="text-lg md:text-2xl font-bold text-white">
              {user?.accountStatus === 'active' && activeMiningPlan
                ? hashrateDisplay
                : '0 TH/s'}
            </div>
          </div>

          <div
            className="p-4 md:p-6 rounded-3xl min-w-0"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
            }}
          >
            <div className="text-xs md:text-sm text-white/60 mb-2">Total Earned</div>
            <div
              className="text-lg md:text-2xl font-bold text-white truncate"
              title={formatMoney(totalEarnedOverviewUsd)}
            >
              {formatMoney(totalEarnedOverviewUsd)}
            </div>
            {pendingReleaseUsd > 0 && (
              <div
                className="text-xs text-blue-200 mt-2 truncate"
                title={`Pending system release: ${formatMoney(pendingReleaseUsd)}`}
              >
                Pending system release: {formatMoney(pendingReleaseUsd)}
              </div>
            )}
            {realEstateMonthlyRealizedUsd > 0 && (
              <div
                className="text-xs text-emerald-200 mt-2 truncate"
                title={`Includes this month's real-estate realized profit: ${formatMoney(realEstateMonthlyRealizedUsd)}`}
              >
                Real-estate realized this month: {formatMoney(realEstateMonthlyRealizedUsd)}
              </div>
            )}
          </div>

          <div
            className="p-4 md:p-6 rounded-3xl min-w-0"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
            }}
          >
            <div className="text-xs md:text-sm text-white/60 mb-2">Mining Earned</div>
            <div className="text-lg md:text-2xl font-bold text-white truncate" title={formatMoney(miningEarnedUsd)}>
              {formatMoney(miningEarnedUsd)}
            </div>
          </div>

          <div
            className="p-4 md:p-6 rounded-3xl min-w-0"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
            }}
          >
            <div className="text-xs md:text-sm text-white/60 mb-2">Trading Earned</div>
            <div className="text-lg md:text-2xl font-bold text-white truncate" title={formatMoney(tradingTotalUsd)}>
              {formatMoney(tradingTotalUsd)}
            </div>
          </div>

          <div
            className="p-4 md:p-6 rounded-3xl min-w-0"
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
            className="p-4 md:p-6 rounded-3xl min-w-0"
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

        <div
          className="p-4 md:p-6 rounded-3xl min-w-0"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-white">Real Estate Snapshot</h2>
              <p className="text-xs md:text-sm text-white/65 mt-1">
                Portfolio signals pulled directly from your real-estate activity.
              </p>
            </div>
            <Link
              href="/dashboard/real-estate"
              className="inline-block px-3 py-1.5 rounded-full text-xs md:text-sm font-semibold text-white"
              style={{
                background: 'linear-gradient(135deg, #582dff, #3a137a)',
              }}
            >
              Open Portfolio
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div
              className="p-4 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.03))',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <div className="text-xs text-white/60 mb-1">Approved Properties</div>
              <div className="text-base md:text-xl font-bold text-white">{realEstateApprovedCount}</div>
            </div>
            <div
              className="p-4 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.03))',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <div className="text-xs text-white/60 mb-1">Pending Verification</div>
              <div className="text-base md:text-xl font-bold text-white">{realEstatePendingCount}</div>
            </div>
            <div
              className="p-4 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.03))',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <div className="text-xs text-white/60 mb-1">Portfolio Allocation</div>
              <div
                className="text-base md:text-xl font-bold text-white truncate"
                title={formatMoney(realEstateTotalAllocationUsd)}
              >
                {formatMoney(realEstateTotalAllocationUsd)}
              </div>
            </div>
            <div
              className="p-4 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.03))',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <div className="text-xs text-white/60 mb-1">Available To Withdraw</div>
              <div
                className="text-base md:text-xl font-bold text-white truncate"
                title={formatMoney(realEstateData.availableWithdrawalUsd)}
              >
                {formatMoney(realEstateData.availableWithdrawalUsd)}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div
          className="p-4 md:p-6 rounded-3xl min-w-0"
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

        <LivePaymentsPageClient />
      </div>
    </div>
  )
}





