import { prisma } from '@/lib/db'
import UserDetail from '@/components/admin/UserDetail'
import { notFound } from 'next/navigation'

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

  const currentPlan = user.userPlans.find(plan => plan.status === 'active') ?? user.userPlans[0]
  const activeMining = user.miningStats.find(stat => stat.isActive) ?? user.miningStats[0]
  const activeEarnings = user.earnings.filter(record => record.isActive)

  const allocationMap = new Map<string, { hashrate: number; hashrateUnit: string; ratio: number | null }>()
  for (const plan of user.userPlans) {
    for (const allocation of plan.multiAssetAllocations) {
      const planHashrate = parseFloat(plan.plan.baseHashrate.toString())
      const allocationHashrate = parseFloat(allocation.hashrate.toString())
      const ratio = planHashrate > 0 ? allocationHashrate / planHashrate : null
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
    ...adminLogs.map(log => ({
      id: `admin-${log.id}`,
      title: `Admin Action (${log.action})`,
      detail: `${log.actorAdmin.fullName || log.actorAdmin.email} - ${log.detail || 'No details'}`,
      timestamp: log.createdAt.toISOString(),
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

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
          btcWalletAddress: user.btcWalletAddress,
          ethWalletAddress: user.ethWalletAddress,
          ltcWalletAddress: user.ltcWalletAddress,
        }}
        currentPlan={
          currentPlan
            ? {
                id: currentPlan.id,
                name: currentPlan.plan.name,
                status: currentPlan.status,
                coinType: currentPlan.plan.coinType,
                baseHashrate: parseFloat(currentPlan.plan.baseHashrate.toString()),
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
        activity={activityLog}
      />
    </div>
  )
}
