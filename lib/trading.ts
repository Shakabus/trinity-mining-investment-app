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

const mulberry32 = (seed: number) => {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const buildStepwiseProgress = ({
  durationMs,
  elapsedMs,
  seed,
  expectedReturnUsd,
  durationHours,
}: {
  durationMs: number
  elapsedMs: number
  seed: number
  expectedReturnUsd: number
  durationHours: number
}) => {
  if (durationMs <= 0) return 1
  const elapsedRatio = clamp(elapsedMs / durationMs, 0, 1)
  const stepCount = Math.round(clamp(durationHours / 3, 6, 22))
  const payoutScale = clamp(expectedReturnUsd / 10000, 0.6, 2.2)
  const rng = mulberry32(Math.floor(seed * 100000 + stepCount * 97))

  const rawIntervals = Array.from({ length: stepCount }, () => 0.6 + rng() * 1.8)
  const intervalSum = rawIntervals.reduce((sum, value) => sum + value, 0)
  const normalizedIntervals = rawIntervals.map(value => value / intervalSum)
  const times: number[] = []
  normalizedIntervals.reduce((acc, value, index) => {
    const next = acc + value
    times[index] = next
    return next
  }, 0)

  const rawWeights = Array.from({ length: stepCount }, () => Math.pow(rng(), 1 / payoutScale))
  const weightSum = rawWeights.reduce((sum, value) => sum + value, 0)
  const weights = rawWeights.map(value => value / weightSum)

  let progress = 0
  for (let i = 0; i < stepCount; i += 1) {
    const prev = i === 0 ? 0 : times[i - 1]
    const current = times[i]
    if (elapsedRatio >= current) {
      progress += weights[i]
      continue
    }
    if (elapsedRatio > prev) {
      const localT = (elapsedRatio - prev) / (current - prev)
      progress += weights[i] * localT
    }
    break
  }

  return clamp(progress, 0, 1)
}

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
  const progress = buildStepwiseProgress({
    durationMs,
    elapsedMs,
    seed,
    expectedReturnUsd,
    durationHours,
  })
  const earnedUsd = expectedReturnUsd * progress
  const pnlUsd = earnedUsd - investmentUsd
  const equityUsd = investmentUsd + pnlUsd
  const dailyEstimateUsd = durationHours > 0 ? (expectedReturnUsd / (durationHours / 24)) : 0
  const winRate = clamp(55 + Math.sin(seed + progress * 2.4) * 12, 40, 78)
  const openPositions = Math.max(1, Math.round(3 + Math.sin(seed + progress * 5) * 2))

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
    const elapsedMs = clamp(timestamp.getTime() - startDate.getTime(), 0, durationMs)
    const progress = buildStepwiseProgress({
      durationMs,
      elapsedMs,
      seed: seed + 13,
      expectedReturnUsd,
      durationHours: Math.max(1, durationMs / (60 * 60 * 1000)),
    })
    const value = expectedReturnUsd * progress
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
