import { prisma } from '@/lib/db'
import { logUserActivity } from '@/lib/user-activity'
import { getCoinGeckoConfig } from '@/lib/security-env'
import {
  computeDailyCryptoEstimate,
  computeTargetDailyCryptoEstimate,
  getMiningPlanTargetMultiplier,
} from '@/lib/mining-engine'

const PRICE_CACHE: {
  fetchedAt: number
  data: Record<string, number> | null
} = {
  fetchedAt: 0,
  data: null,
}

export async function getCryptoPricesUsd() {
  const now = Date.now()
  if (PRICE_CACHE.data && now - PRICE_CACHE.fetchedAt < 60 * 60 * 1000) {
    return PRICE_CACHE.data
  }

  try {
    const config = getCoinGeckoConfig()
    const headers: HeadersInit | undefined = config.apiKey
      ? { [config.apiKeyHeader]: config.apiKey }
      : undefined

    const response = await fetch(
      `${config.apiBaseUrl}/simple/price?ids=bitcoin,ethereum,litecoin&vs_currencies=usd`,
      { cache: 'no-store', headers }
    )
    if (!response.ok) {
      throw new Error('Price fetch failed')
    }
    const json = await response.json()
    const data = {
      BTC: Number(json.bitcoin?.usd) || 0,
      ETH: Number(json.ethereum?.usd) || 0,
      LTC: Number(json.litecoin?.usd) || 0,
    }
    PRICE_CACHE.data = data
    PRICE_CACHE.fetchedAt = now
    return data
  } catch {
    return PRICE_CACHE.data || { BTC: 0, ETH: 0, LTC: 0 }
  }
}

export async function autoUpdateEarnings({
  userId,
  earnings,
  miningStats,
  now,
}: {
  userId: number
  earnings: Array<{
    id: number
    userPlanId: number
    coinType: string
    dailyEstimateUsd: any
    dailyEstimateCrypto: any
    totalEarnedUsd: any
    totalEarnedCrypto: any
    lastCalculatedAt: Date | null
    lastEstimateUpdateAt: Date | null
    lastUsdUpdateAt: Date | null
    isAdminOverride: boolean
    isHistorical: boolean
    isWithdrawable: boolean
    userPlan: {
      status: string
      selectedDurationDays?: number
      finalPrice?: any
      startDate?: Date | null
      endDate?: Date | null
      createdAt?: Date
      plan: { coinType: string; slug?: string; name?: string; baseHashrate: any; hashrateUnit: string }
      multiAssetAllocations: Array<{ coinType: string; hashrate: any; hashrateUnit: string }>
    }
  }>
  miningStats: { assignedHashrate: any; hashrateUnit: string; isActive: boolean } | null
  now: Date
}) {
  const prices = await getCryptoPricesUsd()
  const updates: typeof earnings = []
  const completedPlans = new Set<number>()

  for (const record of earnings) {
    let dailyEstimateCrypto = Number(record.dailyEstimateCrypto)
    let dailyEstimateUsd = Number(record.dailyEstimateUsd)
    let totalEarnedCrypto = Number(record.totalEarnedCrypto)
    let totalEarnedUsd = Number(record.totalEarnedUsd)
    let targetDailyEstimateCrypto: number | null = null
    let targetProgressUsd = 0
    let targetTotalUsd = 0
    let coinPriceUsd = prices[record.coinType as 'BTC' | 'ETH' | 'LTC'] || 0

    if (!record.isAdminOverride) {
      const planStart = record.userPlan.startDate ?? record.userPlan.createdAt ?? now
      const durationDays = Math.max(1, Number(record.userPlan.selectedDurationDays ?? 7))
      const durationMs = durationDays * 24 * 60 * 60 * 1000
      const planEnd =
        record.userPlan.endDate ??
        (record.userPlan.selectedDurationDays
          ? new Date(planStart.getTime() + durationMs)
          : null)
      const isCompleted = Boolean(planEnd && now.getTime() >= planEnd.getTime())
      const cycleProgress = Math.min(
        1,
        Math.max(0, (now.getTime() - planStart.getTime()) / Math.max(1, durationMs))
      )
      const withdrawalUnlockAt = new Date(planStart.getTime() + 2 * 24 * 60 * 60 * 1000)
      const shouldBeWithdrawable = isCompleted || now.getTime() >= withdrawalUnlockAt.getTime()

      if (record.isWithdrawable !== shouldBeWithdrawable) {
        await prisma.earnings.update({
          where: { id: record.id },
          data: { isWithdrawable: shouldBeWithdrawable },
        })
        record.isWithdrawable = shouldBeWithdrawable
      }

      if (record.userPlan.status === 'active' && isCompleted && !completedPlans.has(record.userPlanId)) {
        completedPlans.add(record.userPlanId)
        await prisma.userPlan.update({
          where: { id: record.userPlanId },
          data: { status: 'completed' },
        })

        await prisma.miningStats.updateMany({
          where: { userPlanId: record.userPlanId, isActive: true },
          data: { isActive: false },
        })

        await prisma.earnings.updateMany({
          where: { userPlanId: record.userPlanId },
          data: {
            isWithdrawable: true,
            isHistorical: false,
          },
        })

        const hasActiveMining = await prisma.userPlan.count({
          where: { userId, status: 'active' },
        })
        const hasActiveTrading = await prisma.tradingUserPlan.count({
          where: { userId, status: 'active' },
        })

        if (hasActiveMining === 0 && hasActiveTrading === 0) {
          await prisma.user.update({
            where: { id: userId },
            data: { accountStatus: 'inactive' },
          })
        }

        await logUserActivity({
          userId,
          action: 'PlanCompleted',
          detail: `Mining plan completed. Funds are now available for withdrawal.`,
        })
      }
      const estimateAgeHours = record.lastEstimateUpdateAt
        ? (now.getTime() - record.lastEstimateUpdateAt.getTime()) / (1000 * 60 * 60)
        : 999

      if (!record.isHistorical) {
        const planPriceUsd = Number(record.userPlan.finalPrice ?? 0)
        let targetWeight = 1

        if (record.userPlan.plan.coinType === 'MULTI') {
          const totalAllocationHashrate = record.userPlan.multiAssetAllocations.reduce(
            (sum, item) => sum + Number(item.hashrate || 0),
            0
          )
          const currentAllocation = record.userPlan.multiAssetAllocations.find(
            item => item.coinType === record.coinType
          )
          if (currentAllocation && totalAllocationHashrate > 0) {
            targetWeight = Number(currentAllocation.hashrate || 0) / totalAllocationHashrate
          }
        }

        const targetMultiplier = getMiningPlanTargetMultiplier(record.userPlan.plan.slug)
        targetTotalUsd = Math.max(0, planPriceUsd * targetMultiplier * targetWeight)
        targetProgressUsd = targetTotalUsd * cycleProgress
        targetDailyEstimateCrypto = computeTargetDailyCryptoEstimate({
          planSlug: record.userPlan.plan.slug,
          finalPriceUsd: planPriceUsd,
          durationDays,
          coinUsdPrice: coinPriceUsd,
          allocationWeight: targetWeight,
        })

        if (record.userPlan.plan.coinType === 'MULTI') {
          const allocation = record.userPlan.multiAssetAllocations.find(
            item => item.coinType === record.coinType
          )
          if (allocation && targetDailyEstimateCrypto <= 0) {
            targetDailyEstimateCrypto = computeDailyCryptoEstimate(
              allocation.coinType,
              Number(allocation.hashrate),
              allocation.hashrateUnit
            )
          }
        } else if (miningStats && targetDailyEstimateCrypto <= 0) {
          targetDailyEstimateCrypto = computeDailyCryptoEstimate(
            record.coinType,
            Number(miningStats.assignedHashrate),
            miningStats.hashrateUnit
          )
        }
      }

      const estimateDrift =
        targetDailyEstimateCrypto && targetDailyEstimateCrypto > 0
          ? Math.abs(dailyEstimateCrypto - targetDailyEstimateCrypto) / targetDailyEstimateCrypto
          : 0
      const shouldRefreshEstimate =
        !record.isHistorical &&
        (
          estimateAgeHours >= 12 ||
          dailyEstimateCrypto <= 0 ||
          estimateDrift > 0.08
        )

      if (shouldRefreshEstimate && targetDailyEstimateCrypto && targetDailyEstimateCrypto > 0) {
        dailyEstimateCrypto = targetDailyEstimateCrypto
        const priceForEstimate = prices[record.coinType as 'BTC' | 'ETH' | 'LTC'] || 0
        dailyEstimateUsd = priceForEstimate > 0 ? dailyEstimateCrypto * priceForEstimate : dailyEstimateUsd
        await prisma.earnings.update({
          where: { id: record.id },
          data: {
            dailyEstimateCrypto,
            dailyEstimateUsd,
            lastEstimateUpdateAt: now,
          },
        })
      }

      const isActivePlan = record.userPlan.status === 'active' && !isCompleted
      let earnedTicked = false
      if (miningStats?.isActive && isActivePlan && dailyEstimateCrypto > 0) {
        const lastCalc = record.lastCalculatedAt ?? now
        const elapsedSeconds = Math.max(0, (now.getTime() - lastCalc.getTime()) / 1000)
        if (elapsedSeconds > 0) {
          totalEarnedCrypto += (dailyEstimateCrypto / 86400) * elapsedSeconds
          earnedTicked = true
          await prisma.earnings.update({
            where: { id: record.id },
            data: {
              totalEarnedCrypto,
              lastCalculatedAt: now,
            },
          })
        }
      }

      const usdAgeHours = record.lastUsdUpdateAt
        ? (now.getTime() - record.lastUsdUpdateAt.getTime()) / (1000 * 60 * 60)
        : 999
      if (earnedTicked || usdAgeHours >= 1) {
        const price = coinPriceUsd
        if (price > 0) {
          totalEarnedUsd = totalEarnedCrypto * price
          await prisma.earnings.update({
            where: { id: record.id },
            data: {
              totalEarnedUsd,
              lastUsdUpdateAt: now,
            },
          })
        }
      }

      const minUsdFloor = isCompleted ? targetTotalUsd : targetProgressUsd
      if (minUsdFloor > 0 && totalEarnedUsd + 0.01 < minUsdFloor) {
        totalEarnedUsd = minUsdFloor
        if (coinPriceUsd > 0) {
          totalEarnedCrypto = totalEarnedUsd / coinPriceUsd
        }
        await prisma.earnings.update({
          where: { id: record.id },
          data: {
            totalEarnedUsd,
            totalEarnedCrypto,
            lastCalculatedAt: now,
            lastUsdUpdateAt: now,
          },
        })
      }
    }

    updates.push({
      ...record,
      dailyEstimateCrypto,
      dailyEstimateUsd,
      totalEarnedCrypto,
      totalEarnedUsd,
    })
  }

  return updates
}
