export type TradingPlanConfig = {
  id: number
  minInvestmentUsd: number
  maxInvestmentUsd: number
  minDurationHours: number
  maxDurationHours: number
  minReturnMultiplier: number
  maxReturnMultiplier: number
}

export type TradingSimulationInput = {
  investmentUsd: number
  expectedReturnUsd: number
  durationHours: number
  startDate: Date
  now: Date
  seed: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function pickTradingPlanReturn(config: TradingPlanConfig, investmentUsd: number, seed: number) {
  const normalizedSeed = Math.abs(Math.sin(seed))
  const range = config.maxReturnMultiplier - config.minReturnMultiplier
  const multiplier = config.minReturnMultiplier + normalizedSeed * range
  const expectedReturnUsd = investmentUsd * multiplier
  const durationSeed = Math.abs(Math.cos(seed * 1.7))
  const durationHours = Math.round(
    config.minDurationHours + durationSeed * (config.maxDurationHours - config.minDurationHours)
  )

  return {
    expectedReturnUsd: Math.max(investmentUsd, expectedReturnUsd),
    durationHours,
  }
}

export function simulateTradingProgress({
  investmentUsd,
  expectedReturnUsd,
  durationHours,
  startDate,
  now,
  seed,
}: TradingSimulationInput) {
  const durationMs = durationHours * 60 * 60 * 1000
  const elapsedMs = clamp(now.getTime() - startDate.getTime(), 0, durationMs)
  const baseProgress = durationMs === 0 ? 1 : elapsedMs / durationMs
  const wave = Math.sin(seed + baseProgress * Math.PI * 6) * 0.04
  const jitter = Math.cos(seed * 0.9 + baseProgress * Math.PI * 2) * 0.02
  const progress = clamp(baseProgress + wave + jitter, 0, 1)
  const earnedUsd = expectedReturnUsd * progress
  const pnlUsd = earnedUsd - investmentUsd
  const equityUsd = investmentUsd + pnlUsd
  const dailyEstimateUsd = durationHours > 0 ? (expectedReturnUsd / (durationHours / 24)) : 0
  const winRate = clamp(55 + Math.sin(seed + baseProgress * 2.4) * 12, 40, 78)
  const openPositions = Math.max(1, Math.round(3 + Math.sin(seed + baseProgress * 5) * 2))

  return {
    progress,
    earnedUsd,
    pnlUsd,
    equityUsd,
    dailyEstimateUsd,
    winRate,
    openPositions,
  }
}

export function buildTradingSeries({
  points,
  startDate,
  endDate,
  expectedReturnUsd,
  investmentUsd,
  seed,
}: {
  points: number
  startDate: Date
  endDate: Date
  expectedReturnUsd: number
  investmentUsd: number
  seed: number
}) {
  const durationMs = Math.max(1, endDate.getTime() - startDate.getTime())
  const interval = durationMs / Math.max(1, points - 1)
  return Array.from({ length: points }, (_, index) => {
    const timestamp = new Date(startDate.getTime() + interval * index)
    const progress = clamp((timestamp.getTime() - startDate.getTime()) / durationMs, 0, 1)
    const wave = Math.sin(seed + progress * Math.PI * 5) * 0.04
    const value = expectedReturnUsd * clamp(progress + wave, 0, 1)
    return {
      time: timestamp,
      value: Math.round(value * 100) / 100,
      pnl: Math.round((value - investmentUsd) * 100) / 100,
    }
  })
}

export function buildAllocationSeries(seed: number) {
  const crypto = clamp(45 + Math.sin(seed) * 10, 32, 58)
  const stocks = clamp(30 + Math.cos(seed) * 8, 20, 42)
  const realEstate = clamp(18 + Math.sin(seed * 0.7) * 6, 10, 30)
  const forex = clamp(100 - crypto - stocks - realEstate, 6, 18)
  return [
    { name: 'Crypto', value: Math.round(crypto) },
    { name: 'Stocks', value: Math.round(stocks) },
    { name: 'Real Estate', value: Math.round(realEstate) },
    { name: 'Forex', value: Math.round(forex) },
  ]
}

export function buildTradeFeed(seed: number, count = 10) {
  const assets = ['BTC', 'ETH', 'AAPL', 'TSLA', 'EUR/USD', 'Gold ETF', 'USDT', 'Real Estate Fund']
  const sides = ['Buy', 'Sell'] as const
  return Array.from({ length: count }, (_, index) => {
    const pick = Math.abs(Math.sin(seed + index))
    const asset = assets[Math.floor(pick * assets.length) % assets.length]
    const side = sides[index % sides.length]
    const price = Math.round((100 + pick * 900) * 100) / 100
    const pnl = Math.round(((pick - 0.5) * 120) * 100) / 100
    return {
      id: `${seed}-${index}`,
      asset,
      side,
      price,
      pnl,
      time: new Date(Date.now() - index * 1000 * 60 * 15),
    }
  })
}
