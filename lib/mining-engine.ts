const BASE_DAILY_YIELD_PER_TH: Record<string, number> = {
  BTC: 0.00000022,
  ETH: 0.0000035,
  LTC: 0.000015,
}

const DEFAULT_COIN = 'BTC'
const HASHRATE_UNIT_FACTORS: Record<string, number> = {
  'PH/s': 1000,
  'TH/s': 1,
  'GH/s': 1 / 1000,
  'MH/s': 1 / 1_000_000,
  'KH/s': 1 / 1_000_000_000,
}

// Global accelerator for mining simulation speed.
export const MINING_ENGINE_SPEED_MULTIPLIER = 18

const MINING_PLAN_TARGET_MULTIPLIERS: Record<string, number> = {
  'starter-plan': 2.5,
  'growth-plan': 2.7,
  'standard-plan': 2.9,
  'pro-plan': 3.1,
  'vip-plan': 3.3,
  'elite-multi-asset-plan': 3.5,
}

const DEFAULT_PLAN_TARGET_MULTIPLIER = 2.5

export function normalizeHashrateToTH(hashrate: number, unit: string) {
  return hashrate * (HASHRATE_UNIT_FACTORS[unit] ?? 1)
}

export function getMiningDailyYieldPerTh(coinType: string) {
  const base = BASE_DAILY_YIELD_PER_TH[coinType] ?? BASE_DAILY_YIELD_PER_TH[DEFAULT_COIN]
  return base * MINING_ENGINE_SPEED_MULTIPLIER
}

export function getMiningPlanTargetMultiplier(planSlug?: string | null) {
  if (!planSlug) return DEFAULT_PLAN_TARGET_MULTIPLIER
  return MINING_PLAN_TARGET_MULTIPLIERS[planSlug] ?? DEFAULT_PLAN_TARGET_MULTIPLIER
}

export function computeTargetDailyCryptoEstimate({
  planSlug,
  finalPriceUsd,
  durationDays,
  coinUsdPrice,
  allocationWeight = 1,
}: {
  planSlug?: string | null
  finalPriceUsd: number
  durationDays: number
  coinUsdPrice: number
  allocationWeight?: number
}) {
  const safeFinalPrice = Number.isFinite(finalPriceUsd) ? finalPriceUsd : 0
  const safeDuration = Number.isFinite(durationDays) && durationDays > 0 ? durationDays : 1
  const safePrice = Number.isFinite(coinUsdPrice) ? coinUsdPrice : 0
  const safeWeight = Number.isFinite(allocationWeight) ? Math.max(0, allocationWeight) : 0

  if (safeFinalPrice <= 0 || safePrice <= 0 || safeWeight <= 0) {
    return 0
  }

  const multiplier = getMiningPlanTargetMultiplier(planSlug)
  const totalTargetUsd = safeFinalPrice * multiplier
  const weightedTargetUsd = totalTargetUsd * safeWeight

  return weightedTargetUsd / safePrice / safeDuration
}

export function computeDailyCryptoEstimate(coinType: string, hashrate: number, unit: string) {
  const hashrateTH = normalizeHashrateToTH(hashrate, unit)
  return hashrateTH * getMiningDailyYieldPerTh(coinType)
}

export function computeEarningsIncrement({
  coinType,
  assignedHashrate,
  unit,
  performanceFactor,
  elapsedSeconds,
  dailyEstimateCryptoOverride,
}: {
  coinType: string
  assignedHashrate: number
  unit: string
  performanceFactor: number
  elapsedSeconds: number
  dailyEstimateCryptoOverride?: number
}) {
  const override =
    Number.isFinite(dailyEstimateCryptoOverride) && Number(dailyEstimateCryptoOverride) > 0
      ? Number(dailyEstimateCryptoOverride)
      : null
  const dailyYield = override ?? (() => {
    const hashrateTH = normalizeHashrateToTH(assignedHashrate, unit)
    return hashrateTH * getMiningDailyYieldPerTh(coinType)
  })()

  return (elapsedSeconds / 86400) * dailyYield * performanceFactor
}

export function computeShareRatePerSecond({
  hashrateTH,
  uptimeFactor,
  performanceFactor,
}: {
  hashrateTH: number
  uptimeFactor: number
  performanceFactor: number
}) {
  return hashrateTH * 0.0000045 * uptimeFactor * performanceFactor * MINING_ENGINE_SPEED_MULTIPLIER
}
