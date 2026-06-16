import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import PlanCard from '@/components/dashboard/PlanCard'
import Link from 'next/link'
import { Clock } from 'lucide-react'
import { getFxRates, isSupportedCurrency, type CurrencyCode, convertUsd, formatCurrency } from '@/lib/forex'
import { translate, languageFromCurrency, type LanguageCode } from '@/lib/i18n'
import { scalePlanHashrate } from '@/lib/mining-hashrate'
import { syncMiningPlanCatalog } from '@/lib/mining-plan-catalog'
import { isPaymentReminderVisible } from '@/lib/payment-reminder'

export default async function PlansPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      userPlans: {
        where: { status: 'active' },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  const activePlan = user?.userPlans[0] ?? null
  const pendingUpgrade = user
    ? await prisma.userPlan.findFirst({
        where: {
          userId: user.id,
          status: 'awaiting_payment',
          upgradeFromPlanId: { not: null },
        },
        include: { plan: true },
      })
    : null
  const pendingSelection = user
    ? await prisma.userPlan.findFirst({
        where: {
          userId: user.id,
          status: { in: ['selected', 'awaiting_payment'] },
          upgradeFromPlanId: null,
        },
        orderBy: { createdAt: 'desc' },
      })
    : null
  const now = new Date()
  const showPendingSelectionReminder = pendingSelection
    ? isPaymentReminderVisible(pendingSelection.createdAt, now)
    : false

  const remainingDays = activePlan?.endDate
    ? Math.max(0, Math.ceil((activePlan.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : activePlan?.startDate
    ? Math.max(
        0,
        activePlan.selectedDurationDays -
          Math.floor((now.getTime() - activePlan.startDate.getTime()) / (1000 * 60 * 60 * 24))
      )
    : activePlan?.selectedDurationDays ?? 0

  const creditRatio =
    activePlan && activePlan.selectedDurationDays > 0 ? remainingDays / activePlan.selectedDurationDays : 0
  const proratedCredit = activePlan ? Number(activePlan.finalPrice) * creditRatio : 0
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

  await syncMiningPlanCatalog()

  const plansData = await prisma.plan.findMany({
    where: { status: 'active' },
    include: {
      durationOptions: {
        orderBy: { durationDays: 'asc' }
      },
      features: {
        orderBy: { featureOrder: 'asc' },
        take: 5
      }
    },
    orderBy: { basePrice: 'asc' }
  })

  // Convert Prisma Decimal to plain numbers
  const plans = plansData
    .map(plan => {
      const basePrice = parseFloat(plan.basePrice.toString())
      const baseHashrate = scalePlanHashrate(parseFloat(plan.baseHashrate.toString()))
      const isUpgradeMode = Boolean(activePlan)
      const currentPlanPrice = activePlan ? Number(activePlan.plan.basePrice) : 0
      const isSamePlan = activePlan ? activePlan.planId === plan.id : false
      const features = plan.features.map(feature => ({ ...feature }))
      if (features.length > 0) {
        features[0] = {
          ...features[0],
          featureText: `${baseHashrate.toLocaleString()} ${plan.hashrateUnit} Hash Rate`,
        }
      }

      const durationOptions = plan.durationOptions.map(opt => {
        const priceMultiplier = parseFloat(opt.priceMultiplier.toString())
        const finalPrice = basePrice * priceMultiplier
        let upgradeCredit = 0
        let upgradePrice = finalPrice
        let isEligible = true
        let isExtension = false

        if (isUpgradeMode) {
          if (isSamePlan) {
            isExtension = true
            isEligible = opt.durationDays > (activePlan?.selectedDurationDays || 0)
            if (isEligible) {
              upgradeCredit = proratedCredit
              upgradePrice = finalPrice - upgradeCredit
              isEligible = upgradePrice > 0
            }
          } else {
            if (basePrice <= currentPlanPrice) {
              isEligible = false
            } else {
              upgradeCredit = proratedCredit
              upgradePrice = finalPrice - upgradeCredit
              isEligible = upgradePrice > 0
            }
          }
        }

        return {
          id: opt.id,
          durationDays: opt.durationDays,
          durationLabel: opt.durationLabel,
          createdAt: opt.createdAt,
          priceMultiplier,
          isDefault: opt.isDefault,
          finalPrice,
          upgradeCredit,
          upgradePrice,
          isEligible,
          isExtension,
        }
      })

      const hasEligibleOption = durationOptions.some(option => option.isEligible)
      const lastCatalogUpdate = [
        plan.createdAt,
        ...plan.durationOptions.map(option => option.createdAt),
        ...plan.features.map(feature => feature.createdAt),
      ].reduce((latest, entry) => (entry.getTime() > latest.getTime() ? entry : latest), plan.createdAt)

      return {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        updatedAt: lastCatalogUpdate.toISOString(),
        basePrice,
        coinType: plan.coinType,
        baseHashrate,
        hashrateUnit: plan.hashrateUnit,
        algorithm: plan.algorithm,
        hardwareModel: plan.hardwareModel,
        features,
        durationOptions,
        primaryDurationLabel:
          durationOptions.find(option => option.isDefault)?.durationLabel ?? durationOptions[0]?.durationLabel ?? '',
        isUpgradeMode,
        hasEligibleOption,
        isSamePlan,
      }
    })
    .filter(plan => (activePlan ? plan.hasEligibleOption : true))

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-6">
      <div className="space-y-8">
        {/* Header Section */}
        <div className="text-left max-w-3xl px-4 pt-2">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            {t('plansTitle')}
          </h1>
          <p className="text-base md:text-lg text-white/70 leading-relaxed">
            {t('plansDescription')}
          </p>
        </div>

        {showPendingSelectionReminder && pendingSelection && (
          <div
            className="mx-4 p-4 rounded-2xl text-sm"
            style={{
              background: 'rgba(234, 179, 8, 0.1)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              color: '#fde047',
            }}
          >
            <div className="flex items-start gap-3">
              <Clock size={18} className="text-yellow-300 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">
                  {pendingSelection.status === 'selected'
                    ? t('proofNotSubmittedTitle')
                    : t('paymentPendingTitle')}
                </div>
                <div className="text-yellow-200/80 mt-1">
                  {pendingSelection.status === 'selected'
                    ? t('proofNotSubmittedBody')
                    : t('paymentPendingBody')}
                </div>
                <Link
                  href="/dashboard/payment?verify=1"
                  className="inline-flex mt-3 items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold"
                  style={{
                    background: 'rgba(234, 179, 8, 0.2)',
                    border: '1px solid rgba(234, 179, 8, 0.4)',
                    color: '#fde047',
                  }}
                >
                  {t('uploadPaymentProof')}
                </Link>
              </div>
            </div>
          </div>
        )}

        {pendingUpgrade && (
          <div
            className="mx-4 p-4 rounded-2xl text-sm"
            style={{
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#bfdbfe',
            }}
          >
            {t('upgradePendingPayment')}
          </div>
        )}

        {activePlan && (
          <div
            className="mx-4 p-4 rounded-2xl text-sm"
            style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#a7f3d0',
            }}
          >
            {t('upgradeCreditNote').replace('{amount}', formatMoney(proratedCredit))}
          </div>
        )}

        {/* Plans Grid */}
        {plans.length === 0 ? (
          <div 
            className="p-12 md:p-16 rounded-3xl text-center mx-4"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
            }}
          >
            <div className="text-6xl mb-6">💎</div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">{t('noPlansTitle')}</h2>
            <p className="text-white/70 text-lg">{t('noPlansBody')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 px-2">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
