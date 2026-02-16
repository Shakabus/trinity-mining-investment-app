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
export const MINING_ENGINE_SPEED_MULTIPLIER = 96

export function normalizeHashrateToTH(hashrate: number, unit: string) {
  return hashrate * (HASHRATE_UNIT_FACTORS[unit] ?? 1)
}

export function getMiningDailyYieldPerTh(coinType: string) {
  const base = BASE_DAILY_YIELD_PER_TH[coinType] ?? BASE_DAILY_YIELD_PER_TH[DEFAULT_COIN]
  return base * MINING_ENGINE_SPEED_MULTIPLIER
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
}: {
  coinType: string
  assignedHashrate: number
  unit: string
  performanceFactor: number
  elapsedSeconds: number
}) {
  const hashrateTH = normalizeHashrateToTH(assignedHashrate, unit)
  const dailyYield = getMiningDailyYieldPerTh(coinType)
  return (elapsedSeconds / 86400) * dailyYield * hashrateTH * performanceFactor
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
