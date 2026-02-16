import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Calendar, Hash, Zap, TrendingUp, Clock } from 'lucide-react'
import { getFxRates, isSupportedCurrency, type CurrencyCode, convertUsd, formatCurrency } from '@/lib/forex'
import { translate, languageFromCurrency, type LanguageCode } from '@/lib/i18n'
import { scalePlanHashrate } from '@/lib/mining-hashrate'
import { formatPlanDurationLabel, formatRemainingPlanTime } from '@/lib/mining-duration'
import DashboardAutoRefresh from '@/components/dashboard/DashboardAutoRefresh'

export const dynamic = 'force-dynamic'

export default async function MyPlanPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      userPlans: {
        include: {
          plan: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      },
      miningStats: {
        orderBy: { createdAt: 'desc' },
      },
    }
  })

  const totalPaid = await prisma.payment.aggregate({
    where: { userId: user?.id, status: 'confirmed' },
    _sum: { amountUsd: true },
  })
  const totalInvestment = totalPaid._sum.amountUsd
    ? parseFloat(totalPaid._sum.amountUsd.toString())
    : 0
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

  const activePlan = user?.userPlans.find(plan => plan.status === 'active') || null
  const selectedPlan = user?.userPlans.find(plan => plan.status === 'selected') || null
  const pendingUpgrade = user?.userPlans.find(
    plan => plan.status === 'awaiting_payment' && plan.upgradeFromPlanId
  ) || null
  const currentPlan = activePlan || pendingUpgrade || selectedPlan
  const activeMining = user?.miningStats?.find(stat => stat.isActive) ?? user?.miningStats?.[0] ?? null

  if (!currentPlan) {
    return (
      <div className="max-w-4xl mx-auto px-2 sm:px-4 lg:px-6 py-6">
        <div className="space-y-6">
          <div>
      <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{t('myPlanTitle')}</h1>
            <p className="text-white/70">{t('myPlanSubtitle')}</p>
          </div>

          <div 
            className="p-12 md:p-16 rounded-3xl text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
            }}
          >
            <div className="text-6xl mb-6">📦</div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">{t('noActivePlanTitle')}</h2>
            <p className="text-white/70 mb-8 max-w-md mx-auto">
              {t('noActivePlanBody')}
            </p>
            <Link
              href="/dashboard/plans"
              className="inline-block px-8 py-4 rounded-full font-semibold transition-all text-lg"
              style={{
                background: 'linear-gradient(135deg, #582dff, #3a137a)',
                color: '#ffffff',
                boxShadow: '0 4px 24px rgba(88, 45, 255, 0.4)',
              }}
            >
              {t('browsePlans')} →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Convert Decimals to numbers
  const planData = {
    id: currentPlan.id,
    status: currentPlan.status,
    paymentStatus: currentPlan.paymentStatus,
    planName: currentPlan.plan.name,
    coinType: currentPlan.plan.coinType,
    baseHashrate: activeMining
      ? parseFloat(activeMining.assignedHashrate.toString())
      : scalePlanHashrate(parseFloat(currentPlan.plan.baseHashrate.toString())),
    hashrateUnit: activeMining?.hashrateUnit ?? currentPlan.plan.hashrateUnit,
    algorithm: currentPlan.plan.algorithm,
    hardwareModel: currentPlan.plan.hardwareModel,
    selectedDurationDays: currentPlan.selectedDurationDays,
    finalPrice: parseFloat(currentPlan.finalPrice.toString()),
    startDate: currentPlan.startDate,
    endDate: currentPlan.endDate,
    createdAt: currentPlan.createdAt
  }

  const now = new Date()
  const effectiveStart = planData.startDate ?? planData.createdAt
  const effectiveEnd = planData.endDate
    ? new Date(planData.endDate)
    : effectiveStart
    ? new Date(effectiveStart.getTime() + planData.selectedDurationDays * 24 * 60 * 60 * 1000)
    : null

  const durationMs = Math.max(1, planData.selectedDurationDays * 24 * 60 * 60 * 1000)
  const elapsedMs = effectiveStart
    ? Math.max(0, now.getTime() - effectiveStart.getTime())
    : 0

  const remainingTimeLabel = effectiveEnd
    ? formatRemainingPlanTime(effectiveEnd, now)
    : formatRemainingPlanTime(new Date(now.getTime() + Math.max(0, durationMs - elapsedMs)), now)

  const progressPercentage = planData.selectedDurationDays > 0
    ? Math.min(100, Math.max(0, (elapsedMs / durationMs) * 100))
    : 0

  return (
    <div className="w-full px-2 sm:px-4 lg:px-6 py-6">
      <DashboardAutoRefresh intervalMs={30000} />
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{t('myPlanTitle')}</h1>
          <p className="text-white/70">{t('myPlanManageSubtitle')}</p>
        </div>

        {/* Status Badge */}
        {pendingUpgrade && (
          <div 
            className="p-6 rounded-3xl"
            style={{
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
            }}
          >
            <div className="flex items-start gap-3">
              <Clock size={24} className="text-blue-300 shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-200 mb-2">{t('upgradePendingTitle')}</h3>
                <p className="text-blue-100/80 text-sm mb-4">
                  {t('upgradePendingBody')}
                </p>
                <Link
                  href="/dashboard/payment?verify=1"
                  className="inline-block px-6 py-2 rounded-full text-sm font-semibold transition-all"
                  style={{
                    background: 'rgba(59, 130, 246, 0.2)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    color: '#bfdbfe',
                  }}
                >
                  {t('uploadUpgradeProof')} {'>'}
                </Link>
              </div>
            </div>
          </div>
        )}

        {planData.status === 'selected' && !pendingUpgrade && (
          <div 
            className="p-6 rounded-3xl"
            style={{
              background: 'rgba(234, 179, 8, 0.1)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
            }}
          >
            <div className="flex items-start gap-3">
              <Clock size={24} className="text-yellow-300 shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-yellow-300 mb-2">{t('proofNotSubmittedTitle')}</h3>
                <p className="text-yellow-200/80 text-sm mb-4">
                  {t('proofNotSubmittedBody')}
                </p>
                <Link
                  href="/dashboard/payment?verify=1"
                  className="inline-block px-6 py-2 rounded-full text-sm font-semibold transition-all"
                  style={{
                    background: 'rgba(234, 179, 8, 0.2)',
                    border: '1px solid rgba(234, 179, 8, 0.4)',
                    color: '#fde047',
                  }}
                >
                  {t('uploadPaymentProof')} â†’
                </Link>
              </div>
            </div>
          </div>
        )}

        {planData.status === 'awaiting_payment' && !pendingUpgrade && (
          <div 
            className="p-6 rounded-3xl"
            style={{
              background: 'rgba(234, 179, 8, 0.1)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
            }}
          >
            <div className="flex items-start gap-3">
              <Clock size={24} className="text-yellow-300 shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-yellow-300 mb-2">{t('paymentPendingTitle')}</h3>
                <p className="text-yellow-200/80 text-sm mb-4">
                  {t('paymentPendingBody')}
                </p>
                <Link
                  href="/dashboard/payment?verify=1"
                  className="inline-block px-6 py-2 rounded-full text-sm font-semibold transition-all"
                  style={{
                    background: 'rgba(234, 179, 8, 0.2)',
                    border: '1px solid rgba(234, 179, 8, 0.4)',
                    color: '#fde047',
                  }}
                >
                  {t('uploadPaymentProof')} →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Plan Overview Card */}
        <div 
          className="p-6 md:p-8 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                {planData.planName}
              </h2>
              <div className="flex items-center gap-2">
                <span 
                  className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    background: 'rgba(88, 45, 255, 0.2)',
                    border: '1px solid rgba(88, 45, 255, 0.3)',
                    color: '#a78bfa',
                  }}
                >
                  {planData.coinType}
                </span>
                <span 
                  className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    background: planData.status === 'active' 
                      ? 'rgba(34, 197, 94, 0.2)' 
                      : 'rgba(234, 179, 8, 0.2)',
                    border: planData.status === 'active'
                      ? '1px solid rgba(34, 197, 94, 0.3)'
                      : '1px solid rgba(234, 179, 8, 0.3)',
                    color: planData.status === 'active' ? '#86efac' : '#fde047',
                  }}
                >
                  {planData.status === 'active' ? 'ACTIVE' : 'PENDING'}
                </span>
              </div>
            </div>
            <div className="mt-4 md:mt-0 text-right">
              <div className="text-white/60 text-sm mb-1">Total Investment</div>
              <div className="text-3xl font-bold text-white">
              {formatMoney(totalInvestment)}
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
                <Hash size={16} />
                <span>Hashrate</span>
              </div>
              <div className="text-xl font-bold text-white">
                {planData.baseHashrate} {planData.hashrateUnit}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
                <Zap size={16} />
                <span>Algorithm</span>
              </div>
              <div className="text-xl font-bold text-white">
                {planData.algorithm}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
                <Calendar size={16} />
                <span>Duration</span>
              </div>
              <div className="text-xl font-bold text-white">
                {formatPlanDurationLabel(planData.selectedDurationDays)}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
                <TrendingUp size={16} />
                <span>Time Remaining</span>
              </div>
              <div className="text-xl font-bold text-white">
                {remainingTimeLabel}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {planData.status === 'active' && planData.startDate && planData.endDate && (
            <div className="mb-6">
              <div className="flex justify-between text-sm text-white/60 mb-2">
                <span>Contract Progress</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <div 
                className="w-full h-3 rounded-full overflow-hidden"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progressPercentage}%`,
                    background: 'linear-gradient(90deg, #582dff, #3a137a)',
                  }}
                />
              </div>
            </div>
          )}

          {/* Contract Dates */}
          {planData.startDate && planData.endDate && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                className="p-4 rounded-xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <div className="text-white/60 text-sm mb-1">Start Date</div>
                <div className="text-white font-semibold">
                  {new Date(planData.startDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>

              <div 
                className="p-4 rounded-xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <div className="text-white/60 text-sm mb-1">End Date</div>
                <div className="text-white font-semibold">
                  {new Date(planData.endDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hardware Details */}
        <div 
          className="p-6 md:p-8 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <h3 className="text-xl font-semibold text-white mb-4">Hardware Details</h3>
          <p className="text-white/70">{planData.hardwareModel}</p>
        </div>

        {/* Actions */}
        {planData.status === 'active' && (
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/dashboard/mining"
              className="flex-1 py-4 rounded-full font-semibold text-center transition-all"
              style={{
                background: 'linear-gradient(135deg, #582dff, #3a137a)',
                color: '#ffffff',
                boxShadow: '0 4px 24px rgba(88, 45, 255, 0.4)',
              }}
            >
              View Mining Dashboard →
            </Link>
            {pendingUpgrade ? (
              <div
                className="flex-1 py-4 rounded-full font-semibold text-center"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  opacity: 0.6,
                }}
              >
                Upgrade Pending
              </div>
            ) : (
              <Link
                href="/dashboard/plans"
                className="flex-1 py-4 rounded-full font-semibold text-center transition-all"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                }}
              >
                Upgrade Plan
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
