import { prisma } from '@/lib/db'
import UserDetail from '@/components/admin/UserDetail'
import { notFound } from 'next/navigation'
import { getRealEstateDashboardData } from '@/lib/real-estate-dashboard'
import { scalePlanHashrate } from '@/lib/mining-hashrate'
import { clerkClient } from '@clerk/nextjs/server'
import { Prisma } from '@prisma/client'
import { formatLocationLabel, parseLocationEventDetail } from '@/lib/location-tracking'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { id } = await params
  const userId = Number(id)
  if (Number.isNaN(userId)) {
    notFound()
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userPlans: {
        include: {
          plan: true,
          payments: true,
          multiAssetAllocations: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      miningStats: {
        orderBy: { createdAt: 'desc' },
      },
      earnings: {
        include: {
          userPlan: {
            include: {
              plan: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!user) {
    notFound()
  }

  const [tradingPlans, tradingStats, tradingEarnings] = await Promise.all([
    prisma.$queryRaw<
      Array<{
        id: number
        status: string
        investmentUsd: Prisma.Decimal | number
        expectedReturnUsd: Prisma.Decimal | number
        durationHours: number
        startDate: Date | string | null
        endDate: Date | string | null
        updatedAt: Date | string
        planName: string | null
      }>
    >(
      Prisma.sql`
        SELECT
          tup.id,
          tup.status,
          tup.investment_usd AS investmentUsd,
          tup.expected_return_usd AS expectedReturnUsd,
          tup.duration_hours AS durationHours,
          tup.start_date AS startDate,
          tup.end_date AS endDate,
          tup.updated_at AS updatedAt,
          tp.name AS planName
        FROM trading_user_plans tup
        LEFT JOIN trading_plans tp ON tp.id = tup.plan_id
        WHERE tup.user_id = ${userId}
        ORDER BY tup.created_at DESC
      `
    ),
    prisma.$queryRaw<
      Array<{
        id: number
        botSpeed: Prisma.Decimal | number
        strategy: string | null
        riskLevel: string | null
        isActive: boolean | number
      }>
    >(
      Prisma.sql`
        SELECT
          ts.id,
          ts.bot_speed AS botSpeed,
          ts.strategy,
          ts.risk_level AS riskLevel,
          ts.is_active AS isActive
        FROM trading_stats ts
        WHERE ts.user_id = ${userId}
        ORDER BY ts.created_at DESC
      `
    ),
    prisma.$queryRaw<
      Array<{
        id: number
        dailyEstimateUsd: Prisma.Decimal | number
        totalEarnedUsd: Prisma.Decimal | number
        isActive: boolean | number
        isAdminOverride: boolean | number
        updatedAt: Date | string
        planName: string | null
      }>
    >(
      Prisma.sql`
        SELECT
          te.id,
          te.daily_estimate_usd AS dailyEstimateUsd,
          te.total_earned_usd AS totalEarnedUsd,
          te.is_active AS isActive,
          te.is_admin_override AS isAdminOverride,
          te.updated_at AS updatedAt,
          tp.name AS planName
        FROM trading_earnings te
        LEFT JOIN trading_user_plans tup ON tup.id = te.trading_user_plan_id
        LEFT JOIN trading_plans tp ON tp.id = tup.plan_id
        WHERE te.user_id = ${userId}
        ORDER BY te.created_at DESC
      `
    ),
  ])

  const toNumber = (value: Prisma.Decimal | number | null | undefined) => Number(value ?? 0)
  const toBoolean = (value: boolean | number | null | undefined) => {
    if (typeof value === 'boolean') return value
    return Number(value ?? 0) !== 0
  }
  const toIsoOrNull = (value: Date | string | null | undefined) => (value ? new Date(value).toISOString() : null)

  const normalizedTradingPlans = tradingPlans.map(plan => ({
    id: plan.id,
    name: plan.planName ?? 'Trading plan',
    status: plan.status,
    investmentUsd: toNumber(plan.investmentUsd),
    expectedReturnUsd: toNumber(plan.expectedReturnUsd),
    durationHours: Number(plan.durationHours),
    startDate: toIsoOrNull(plan.startDate),
    endDate: toIsoOrNull(plan.endDate),
    updatedAt: new Date(plan.updatedAt).toISOString(),
  }))

  const normalizedTradingStats = tradingStats.map(stat => ({
    id: stat.id,
    botSpeed: toNumber(stat.botSpeed),
    strategy: stat.strategy ?? 'Portfolio Balance',
    riskLevel: stat.riskLevel ?? 'balanced',
    isActive: toBoolean(stat.isActive),
  }))

  const normalizedTradingEarnings = tradingEarnings.map(record => ({
    id: record.id,
    dailyEstimateUsd: toNumber(record.dailyEstimateUsd),
    totalEarnedUsd: toNumber(record.totalEarnedUsd),
    isActive: toBoolean(record.isActive),
    isAdminOverride: toBoolean(record.isAdminOverride),
    planName: record.planName ?? 'Unknown Plan',
    updatedAt: new Date(record.updatedAt).toISOString(),
  }))
  let passwordEnabled: boolean | null = null
  try {
    const clerk = await clerkClient()
    const clerkUser = await clerk.users.getUser(user.clerkUserId)
    passwordEnabled = clerkUser.passwordEnabled
  } catch {
    passwordEnabled = null
  }

  const realEstateData = await getRealEstateDashboardData(user.clerkUserId)
  const now = new Date()
  const realEstateMonthlyRealizedUsd = realEstateData.payouts
    .filter(item => item.status === 'paid')
    .filter(item => {
      const payoutDate = new Date(item.payoutDate)
      return payoutDate.getFullYear() === now.getFullYear() && payoutDate.getMonth() === now.getMonth()
    })
    .reduce((sum, item) => sum + item.netUsd, 0)
  const realEstateTotalAllocationUsd = realEstateData.positions.reduce(
    (sum, item) => sum + item.allocationUsd,
    0,
  )
  const realEstateApprovedCount = realEstateData.positions.filter(item => item.status === 'approved').length
  const realEstatePendingCount = realEstateData.positions.filter(item => item.status !== 'approved').length

  const currentPlan = user.userPlans.find(plan => plan.status === 'active') ?? user.userPlans[0]
  const activeMining = user.miningStats.find(stat => stat.isActive) ?? user.miningStats[0]
  const activeEarnings = user.earnings.filter(record => record.isActive)
  const activeTradingPlan =
    normalizedTradingPlans.find(plan => plan.status === 'active') ?? normalizedTradingPlans[0]
  const activeTradingStats = normalizedTradingStats.find(stat => stat.isActive) ?? normalizedTradingStats[0]
  const activeTradingEarnings = normalizedTradingEarnings.filter(record => record.isActive)

  const allocationMap = new Map<string, { hashrate: number; hashrateUnit: string; ratio: number | null }>()
  for (const plan of user.userPlans) {
    for (const allocation of plan.multiAssetAllocations) {
      const planHashrateRaw = parseFloat(plan.plan.baseHashrate.toString())
      const planHashrateScaled = scalePlanHashrate(planHashrateRaw)
      const allocationHashrate = parseFloat(allocation.hashrate.toString())
      const ratioBase = allocationHashrate > planHashrateRaw ? planHashrateScaled : planHashrateRaw
      const ratio = ratioBase > 0 ? allocationHashrate / ratioBase : null
      allocationMap.set(`${plan.id}-${allocation.coinType}`, {
        hashrate: allocationHashrate,
        hashrateUnit: allocation.hashrateUnit,
        ratio,
      })
    }
  }

  const adminLogs = prisma.adminActivityLog
    ? await prisma.adminActivityLog.findMany({
        where: { targetUserId: userId },
        include: {
          actorAdmin: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
    : []

  const locationLogs = await prisma.userActivityLog.findMany({
    where: {
      userId,
      action: {
        in: ['UserLoginLocation', 'UserSignupLocation'],
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      action: true,
      detail: true,
      createdAt: true,
    },
  })

  let lastLoginLocation: string | null = null
  let lastLoginAt: string | null = null
  let signupLocation: string | null = null
  let signupLocationAt: string | null = null
  for (const log of locationLogs) {
    const parsed = parseLocationEventDetail(log.detail)
    if (!parsed) continue

    if (log.action === 'UserLoginLocation' && !lastLoginLocation) {
      lastLoginLocation = formatLocationLabel(parsed)
      lastLoginAt = log.createdAt.toISOString()
    } else if (log.action === 'UserSignupLocation' && !signupLocation) {
      signupLocation = formatLocationLabel(parsed)
      signupLocationAt = log.createdAt.toISOString()
    }

    if (lastLoginLocation && signupLocation) break
  }

  const activityLog = [
    ...user.userPlans.map(plan => ({
      id: `plan-${plan.id}`,
      title: 'Plan Update',
      detail: `${plan.plan.name} - ${plan.status}`,
      timestamp: plan.updatedAt.toISOString(),
    })),
    ...user.payments.map(payment => ({
      id: `payment-${payment.id}`,
      title: 'Payment',
      detail: `${payment.cryptoType} ${payment.amountUsd.toString()} - ${payment.status}`,
      timestamp: payment.createdAt.toISOString(),
    })),
    ...normalizedTradingPlans.map(plan => ({
      id: `trading-plan-${plan.id}`,
      title: 'Trading Plan',
      detail: `${plan.name} - ${plan.status}`,
      timestamp: plan.updatedAt,
    })),
    ...normalizedTradingEarnings.map(record => ({
      id: `trading-earning-${record.id}`,
      title: 'Trading Earnings',
      detail: `Total earned $${record.totalEarnedUsd.toFixed(2)}`,
      timestamp: record.updatedAt,
    })),
    ...adminLogs.map(log => ({
      id: `admin-${log.id}`,
      title: `Admin Action (${log.action})`,
      detail: `${log.actorAdmin.fullName || log.actorAdmin.email} - ${log.detail || 'No details'}`,
      timestamp: log.createdAt.toISOString(),
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const userSessionMeta = user as typeof user & {
    lastSeenAt?: Date | null
    currentSessionStartedAt?: Date | null
    totalSessionSeconds?: number | null
  }

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
      <UserDetail
        user={{
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          accountStatus: user.accountStatus,
          createdAt: user.createdAt.toISOString(),
          lastSeenAt: userSessionMeta.lastSeenAt ? userSessionMeta.lastSeenAt.toISOString() : null,
          currentSessionStartedAt: userSessionMeta.currentSessionStartedAt
            ? userSessionMeta.currentSessionStartedAt.toISOString()
            : null,
          totalSessionSeconds: userSessionMeta.totalSessionSeconds ?? 0,
          btcWalletAddress: user.btcWalletAddress,
          ethWalletAddress: user.ethWalletAddress,
          ltcWalletAddress: user.ltcWalletAddress,
          usdtWalletAddress: user.walletAddress,
          passwordEnabled,
          lastLoginLocation,
          lastLoginAt,
          signupLocation,
          signupLocationAt,
        }}
        currentPlan={
          currentPlan
            ? {
                id: currentPlan.id,
                name: currentPlan.plan.name,
                status: currentPlan.status,
                coinType: currentPlan.plan.coinType,
                baseHashrate: scalePlanHashrate(parseFloat(currentPlan.plan.baseHashrate.toString())),
                hashrateUnit: currentPlan.plan.hashrateUnit,
                algorithm: currentPlan.plan.algorithm,
                startDate: currentPlan.startDate ? currentPlan.startDate.toISOString() : null,
                endDate: currentPlan.endDate ? currentPlan.endDate.toISOString() : null,
              }
            : undefined
        }
        miningStats={
          activeMining
            ? {
                id: activeMining.id,
                assignedHashrate: parseFloat(activeMining.assignedHashrate.toString()),
                hashrateUnit: activeMining.hashrateUnit,
                counterSpeed: parseFloat(activeMining.counterSpeed.toString()),
                isActive: activeMining.isActive,
                miningPool: activeMining.miningPool,
                dataCenterLocation: activeMining.dataCenterLocation,
              }
            : undefined
        }
        earnings={activeEarnings.map(record => {
          const planName = record.userPlan?.plan?.name ?? 'Unknown Plan'
          const planCoinType = record.userPlan?.plan?.coinType ?? 'N/A'
          const key = record.userPlan ? `${record.userPlan.id}-${record.coinType}` : ''
          const allocation = allocationMap.get(key)
          const allocationLabel = allocation
            ? `${allocation.hashrate.toFixed(2)} ${allocation.hashrateUnit}`
            : null
          const ratioLabel =
            allocation && allocation.ratio !== null
              ? `${Math.round(allocation.ratio * 100)}% allocation`
              : null
          const contextLabel =
            planCoinType === 'MULTI'
              ? `${planName} - ${record.coinType} ${ratioLabel ? `(${ratioLabel})` : ''}`.trim()
              : `${planName} (${planCoinType})`

          return {
            id: record.id,
            coinType: record.coinType,
            dailyEstimateUsd: parseFloat(record.dailyEstimateUsd.toString()),
            dailyEstimateCrypto: parseFloat(record.dailyEstimateCrypto.toString()),
            totalEarnedUsd: parseFloat(record.totalEarnedUsd.toString()),
            totalEarnedCrypto: parseFloat(record.totalEarnedCrypto.toString()),
            isActive: record.isActive,
            isAdminOverride: record.isAdminOverride,
            isHistorical: record.isHistorical,
            isWithdrawable: record.isWithdrawable,
            contextLabel,
            allocationLabel,
            planName,
          }
        })}
        tradingPlan={
          activeTradingPlan
            ? {
                id: activeTradingPlan.id,
                name: activeTradingPlan.name,
                status: activeTradingPlan.status,
                investmentUsd: activeTradingPlan.investmentUsd,
                expectedReturnUsd: activeTradingPlan.expectedReturnUsd,
                durationHours: activeTradingPlan.durationHours,
                startDate: activeTradingPlan.startDate,
                endDate: activeTradingPlan.endDate,
              }
            : undefined
        }
        tradingStats={
          activeTradingStats
            ? {
                id: activeTradingStats.id,
                botSpeed: activeTradingStats.botSpeed,
                strategy: activeTradingStats.strategy,
                riskLevel: activeTradingStats.riskLevel,
                isActive: activeTradingStats.isActive,
              }
            : undefined
        }
        tradingEarnings={activeTradingEarnings.map(record => ({
          id: record.id,
          dailyEstimateUsd: record.dailyEstimateUsd,
          totalEarnedUsd: record.totalEarnedUsd,
          isActive: record.isActive,
          isAdminOverride: record.isAdminOverride,
          planName: record.planName,
        }))}
        realEstate={{
          summary: {
            totalAllocationUsd: realEstateTotalAllocationUsd,
            approvedCount: realEstateApprovedCount,
            pendingCount: realEstatePendingCount,
            availableWithdrawalUsd: realEstateData.availableWithdrawalUsd,
            monthlyRealizedUsd: realEstateMonthlyRealizedUsd,
            canRequestWithdrawal: realEstateData.canRequestWithdrawal,
            nextWithdrawalEligibleAt: realEstateData.nextWithdrawalEligibleAt,
            canCreateNewBuyIn: realEstateData.canCreateNewBuyIn,
          },
          positions: realEstateData.positions.map(position => ({
            id: position.id,
            property: position.property,
            location: position.location,
            tier: position.tier,
            allocationUsd: position.allocationUsd,
            duration: position.duration,
            projectedBand: position.projectedBand,
            monthlyIncomeUsd: position.monthlyIncomeUsd,
            submittedAt: position.submittedAt,
            status: position.status,
          })),
          withdrawals: realEstateData.withdrawals.map(withdrawal => ({
            id: withdrawal.id,
            reference: withdrawal.reference,
            requestedAt: withdrawal.requestedAt,
            amountUsd: withdrawal.amountUsd,
            method: withdrawal.method,
            destination: withdrawal.destination,
            status: withdrawal.status,
          })),
        }}
        activity={activityLog}
      />
    </div>
  )
}
