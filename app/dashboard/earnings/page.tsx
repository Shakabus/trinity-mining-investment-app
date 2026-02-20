import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import EarningsDisplay from '@/components/dashboard/EarningsDisplay'
import { autoUpdateEarnings } from '@/lib/earnings'
import { translate, languageFromCurrency, type LanguageCode } from '@/lib/i18n'
import { getFxRates, isSupportedCurrency, type CurrencyCode } from '@/lib/forex'

export default async function EarningsPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: {
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
      withdrawals: {
        orderBy: { requestedAt: 'desc' },
      },
    },
  })

  if (!user) {
    redirect('/sign-in')
  }

  const activeMining = user.miningStats.find(stat => stat.isActive) ?? user.miningStats[0] ?? null
  const activeMiningPlan = user.earnings.find(record => record.userPlan?.status === 'active')?.userPlan ?? null
  const startDate = (activeMiningPlan?.startDate ?? activeMining?.createdAt ?? null)?.toISOString() ?? null
  const planDurationDays = activeMiningPlan?.selectedDurationDays ?? null
  const now = new Date()

  const updatedRecords = await autoUpdateEarnings({
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

  const rates = await getFxRates()
  const preferredCurrency: CurrencyCode = isSupportedCurrency(user?.preferredCurrency || '')
    ? (user?.preferredCurrency as CurrencyCode)
    : 'USD'
  const preferredLanguage: LanguageCode = user?.preferredLanguage
    ? (user?.preferredLanguage as LanguageCode)
    : languageFromCurrency(preferredCurrency)
  const t = (key: string) => translate(key, preferredLanguage)

  const records = updatedRecords.map(record => ({
    id: record.id,
    coinType: record.coinType,
    planName: record.userPlan?.plan?.name ?? t('unknownPlan'),
    dailyEstimateUsd: Number(record.dailyEstimateUsd),
    dailyEstimateCrypto: Number(record.dailyEstimateCrypto),
    totalEarnedUsd: Number(record.totalEarnedUsd),
    totalEarnedCrypto: Number(record.totalEarnedCrypto),
    lastCalculatedAt: record.lastCalculatedAt ? record.lastCalculatedAt.toISOString() : null,
    isHistorical: record.isHistorical,
    isWithdrawable: record.isWithdrawable,
  }))

  const lastUpdatedAt = records
    .map(record => record.lastCalculatedAt)
    .filter(Boolean)
    .sort()
    .slice(-1)[0] ?? null

  const withdrawableUsd = records
    .filter(record => record.isWithdrawable)
    .reduce((sum, record) => sum + record.totalEarnedUsd, 0)

  const reservedUsd = user.withdrawals
    .filter(item => item.status === 'pending')
    .reduce((sum, item) => sum + Number(item.amountUsd), 0)

  const availableUsd = Math.max(0, withdrawableUsd - reservedUsd)

  const activePlan = user.earnings.find(record => record.userPlan?.status === 'active')?.userPlan
  const dailyActiveUsd = records
    .filter(record => record.planName === activePlan?.plan?.name && !record.isHistorical)
    .reduce((sum, record) => sum + record.dailyEstimateUsd, 0)
  const estimatedTotalUsd =
    activePlan && dailyActiveUsd > 0 ? dailyActiveUsd * (activePlan.selectedDurationDays ?? 0) : 0
  const baseMinWithdrawalUsd = estimatedTotalUsd > 0 && estimatedTotalUsd < 100 ? estimatedTotalUsd : 100
  const minWithdrawalUsd =
    availableUsd > 0 ? Math.max(1, Math.min(baseMinWithdrawalUsd, availableUsd)) : baseMinWithdrawalUsd

  const payouts = user.withdrawals.map(item => ({
    id: item.id.toString(),
    date: item.requestedAt.toISOString(),
    amountUsd: Number(item.amountUsd),
    status: item.status,
    method: item.coinType,
  }))

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{t('earningsTitle')}</h1>
          <p className="text-white/70">{t('earningsSubtitle')}</p>
        </div>

        <EarningsDisplay
          records={records}
          startDate={startDate}
          planDurationDays={planDurationDays}
          lastUpdatedAt={lastUpdatedAt}
          lastPayoutAt={null}
          payouts={payouts}
          withdrawableUsd={availableUsd}
          pendingUsd={reservedUsd}
          minWithdrawalUsd={minWithdrawalUsd}
        />
      </div>
    </div>
  )
}
