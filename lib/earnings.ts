import { prisma } from '@/lib/db'

const DAILY_YIELD_PER_TH: Record<string, number> = {
  BTC: 0.00000022,
  ETH: 0.0000035,
  LTC: 0.000015,
}

const PRICE_CACHE: {
  fetchedAt: number
  data: Record<string, number> | null
} = {
  fetchedAt: 0,
  data: null,
}

export function normalizeHashrateToTH(hashrate: number, unit: string) {
  if (unit === 'PH/s') return hashrate * 1000
  if (unit === 'GH/s') return hashrate / 1000
  if (unit === 'MH/s') return hashrate / 1_000_000
  return hashrate
}

export async function getCryptoPricesUsd() {
  const now = Date.now()
  if (PRICE_CACHE.data && now - PRICE_CACHE.fetchedAt < 60 * 60 * 1000) {
    return PRICE_CACHE.data
  }

  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,litecoin&vs_currencies=usd',
      { cache: 'no-store' }
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

export function computeDailyCryptoEstimate(coinType: string, hashrate: number, unit: string) {
  const hashrateTH = normalizeHashrateToTH(hashrate, unit)
  const yieldPerTh = DAILY_YIELD_PER_TH[coinType] ?? DAILY_YIELD_PER_TH.BTC
  return hashrateTH * yieldPerTh
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
      plan: { coinType: string; baseHashrate: any; hashrateUnit: string }
      multiAssetAllocations: Array<{ coinType: string; hashrate: any; hashrateUnit: string }>
    }
  }>
  miningStats: { assignedHashrate: any; hashrateUnit: string; isActive: boolean } | null
  now: Date
}) {
  const prices = await getCryptoPricesUsd()
  const updates: typeof earnings = []

  for (const record of earnings) {
    let dailyEstimateCrypto = Number(record.dailyEstimateCrypto)
    let dailyEstimateUsd = Number(record.dailyEstimateUsd)
    let totalEarnedCrypto = Number(record.totalEarnedCrypto)
    let totalEarnedUsd = Number(record.totalEarnedUsd)

    if (!record.isAdminOverride) {
      const estimateAgeHours = record.lastEstimateUpdateAt
        ? (now.getTime() - record.lastEstimateUpdateAt.getTime()) / (1000 * 60 * 60)
        : 999

      if (!record.isHistorical && estimateAgeHours >= 12) {
        if (record.userPlan.plan.coinType === 'MULTI') {
          const allocation = record.userPlan.multiAssetAllocations.find(
            item => item.coinType === record.coinType
          )
          if (allocation) {
            dailyEstimateCrypto = computeDailyCryptoEstimate(
              allocation.coinType,
              Number(allocation.hashrate),
              allocation.hashrateUnit
            )
          }
        } else if (miningStats) {
          dailyEstimateCrypto = computeDailyCryptoEstimate(
            record.coinType,
            Number(miningStats.assignedHashrate),
            miningStats.hashrateUnit
          )
        }
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

      const isActivePlan = record.userPlan.status === 'active'
      if (miningStats?.isActive && isActivePlan && dailyEstimateCrypto > 0) {
        const lastCalc = record.lastCalculatedAt ?? now
        const elapsedSeconds = Math.max(0, (now.getTime() - lastCalc.getTime()) / 1000)
        if (elapsedSeconds > 0) {
          totalEarnedCrypto += (dailyEstimateCrypto / 86400) * elapsedSeconds
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
      if (usdAgeHours >= 1) {
        const price = prices[record.coinType as 'BTC' | 'ETH' | 'LTC'] || 0
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
