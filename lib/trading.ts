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

const buildJumpSchedule = ({
  durationMs,
  seed,
  expectedReturnUsd,
  investmentUsd,
}: {
  durationMs: number
  seed: number
  expectedReturnUsd: number
  investmentUsd: number
}) => {
  const rng = mulberry32(Math.floor(seed * 100000 + durationMs % 997))
  const minIntervalMs = 60 * 1000
  const maxIntervalMs = 2 * 60 * 60 * 1000
  const payoutScale = clamp(expectedReturnUsd / 10000, 0.6, 2.2)
  const schedule: { timeMs: number; earnedUsd: number }[] = []
  let timeMs = 0
  let earnedUsd = 0
  let steps = 0

  while (timeMs < durationMs) {
    const interval = minIntervalMs + rng() * (maxIntervalMs - minIntervalMs)
    timeMs = Math.min(durationMs, timeMs + interval)
    schedule.push({ timeMs, earnedUsd })
    steps += 1
    if (timeMs === durationMs) break
  }

  if (steps === 0) {
    return [{ timeMs: durationMs, earnedUsd: expectedReturnUsd }]
  }

  const minEquity = investmentUsd * 0.2
  let remaining = expectedReturnUsd
  for (let i = 0; i < schedule.length; i += 1) {
    const stepsLeft = schedule.length - i
    const base = remaining / stepsLeft
    const volatility = clamp(0.35 + (1 - Math.min(1, payoutScale / 2.2)) * 0.25, 0.25, 0.6)
    const direction = rng() < 0.35 ? -1 : 1
    const noise = base * (rng() * volatility)
    let delta = base + direction * noise

    if (i === schedule.length - 1) {
      delta = remaining
    } else {
      const maxDelta = base * (2.5 * payoutScale)
      const minDelta = -base * (1.4 * payoutScale)
      delta = clamp(delta, minDelta, maxDelta)
    }

    earnedUsd = clamp(earnedUsd + delta, minEquity - investmentUsd, expectedReturnUsd)
    remaining = expectedReturnUsd - earnedUsd
    schedule[i] = { timeMs: schedule[i].timeMs, earnedUsd }
  }

  return schedule
}

const getSchedulePoint = (
  schedule: { timeMs: number; earnedUsd: number }[],
  elapsedMs: number
) => {
  if (schedule.length === 0) {
    return { earnedUsd: 0, stepIndex: 0 }
  }
  if (elapsedMs <= schedule[0].timeMs) {
    const first = schedule[0]
    const earnedUsd = first.timeMs === 0 ? first.earnedUsd : (first.earnedUsd * elapsedMs) / first.timeMs
    return { earnedUsd, stepIndex: 0 }
  }
  for (let i = 1; i < schedule.length; i += 1) {
    if (elapsedMs <= schedule[i].timeMs) {
      const prev = schedule[i - 1]
      const current = schedule[i]
      const span = current.timeMs - prev.timeMs
      const t = span === 0 ? 1 : (elapsedMs - prev.timeMs) / span
      const earnedUsd = prev.earnedUsd + (current.earnedUsd - prev.earnedUsd) * t
      return { earnedUsd, stepIndex: i }
    }
  }
  return { earnedUsd: schedule[schedule.length - 1].earnedUsd, stepIndex: schedule.length - 1 }
}

const computePnlNoise = ({
  seed,
  stepIndex,
  progress,
  expectedReturnUsd,
  investmentUsd,
}: {
  seed: number
  stepIndex: number
  progress: number
  expectedReturnUsd: number
  investmentUsd: number
}) => {
  const rng = mulberry32(Math.floor(seed * 100000 + stepIndex * 37 + 11))
  const scaleBase = clamp(expectedReturnUsd * 0.2, 75, expectedReturnUsd * 0.55)
  const volatility = 0.4 + rng() * 0.7
  const signed = rng() * 2 - 1
  const intensity = scaleBase * volatility * (0.35 + 0.65 * progress)
  const noise = signed * intensity
  const minPnl = -0.8 * investmentUsd
  const maxPnl = expectedReturnUsd - investmentUsd
  return clamp(noise, minPnl - (expectedReturnUsd * 0.35), maxPnl * 0.55)
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
  const schedule = buildJumpSchedule({
    durationMs,
    seed,
    expectedReturnUsd,
    investmentUsd,
  })
  const { earnedUsd, stepIndex } = getSchedulePoint(schedule, elapsedMs)
  const progress = expectedReturnUsd === 0 ? 0 : clamp(earnedUsd / expectedReturnUsd, 0, 1)
  const pnlBase = earnedUsd - investmentUsd
  const pnlNoise = computePnlNoise({
    seed,
    stepIndex,
    progress,
    expectedReturnUsd,
    investmentUsd,
  })
  const pnlUsd = clamp(pnlBase + pnlNoise, -0.6 * investmentUsd, expectedReturnUsd - investmentUsd)
  const equityUsd = investmentUsd + pnlUsd
  const dailyEstimateUsd = durationHours > 0 ? (expectedReturnUsd / (durationHours / 24)) : 0
  const winRate = clamp(55 + Math.sin(seed + progress * 2.4) * 12, 40, 78)
  const planScale = clamp(investmentUsd / 10000, 0.8, 3.2)
  const basePositions = Math.round(3 + planScale * 1.6)
  const jumpIndex = Math.round(progress * clamp(durationHours / 2, 4, 36))
  const openPositions = Math.max(1, Math.round(basePositions + Math.sin(seed + jumpIndex * 0.9) * (2 + planScale * 0.6)))

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
  const schedule = buildJumpSchedule({
    durationMs,
    seed: seed + 13,
    expectedReturnUsd,
    investmentUsd,
  })
  return Array.from({ length: points }, (_, index) => {
    const timestamp = new Date(startDate.getTime() + interval * index)
    const elapsedMs = clamp(timestamp.getTime() - startDate.getTime(), 0, durationMs)
    const { earnedUsd, stepIndex } = getSchedulePoint(schedule, elapsedMs)
    const progress = expectedReturnUsd === 0 ? 0 : clamp(earnedUsd / expectedReturnUsd, 0, 1)
    const pnlBase = earnedUsd - investmentUsd
    const pnlNoise = computePnlNoise({
      seed: seed + 13,
      stepIndex,
      progress,
      expectedReturnUsd,
      investmentUsd,
    })
    const pnl = clamp(pnlBase + pnlNoise, -0.6 * investmentUsd, expectedReturnUsd - investmentUsd)
    return {
      time: timestamp,
      value: Math.round(earnedUsd * 100) / 100,
      pnl: Math.round(pnl * 100) / 100,
    }
  })
}

export function buildTradingJumpSeries({
  startDate,
  endDate,
  expectedReturnUsd,
  investmentUsd,
  seed,
}: {
  startDate: Date
  endDate: Date
  expectedReturnUsd: number
  investmentUsd: number
  seed: number
}) {
  const durationMs = Math.max(1, endDate.getTime() - startDate.getTime())
  const schedule = buildJumpSchedule({
    durationMs,
    seed,
    expectedReturnUsd,
    investmentUsd,
  })

  const points = schedule.map(point => {
    const timestamp = new Date(startDate.getTime() + point.timeMs)
    const { earnedUsd, stepIndex } = getSchedulePoint(schedule, point.timeMs)
    const progress = expectedReturnUsd === 0 ? 0 : clamp(earnedUsd / expectedReturnUsd, 0, 1)
    const pnlBase = earnedUsd - investmentUsd
    const pnlNoise = computePnlNoise({
      seed,
      stepIndex,
      progress,
      expectedReturnUsd,
      investmentUsd,
    })
    const pnl = clamp(pnlBase + pnlNoise, -0.6 * investmentUsd, expectedReturnUsd - investmentUsd)
    return {
      time: timestamp,
      earnedUsd: Math.round(earnedUsd * 100) / 100,
      pnl: Math.round(pnl * 100) / 100,
      equity: Math.round((investmentUsd + pnl) * 100) / 100,
      stepIndex,
    }
  })

  const finalPoint = points[points.length - 1]
  if (!finalPoint || finalPoint.time.getTime() !== endDate.getTime()) {
    const { earnedUsd, stepIndex } = getSchedulePoint(schedule, durationMs)
    const progress = expectedReturnUsd === 0 ? 0 : clamp(earnedUsd / expectedReturnUsd, 0, 1)
    const pnlBase = earnedUsd - investmentUsd
    const pnlNoise = computePnlNoise({
      seed,
      stepIndex,
      progress,
      expectedReturnUsd,
      investmentUsd,
    })
    const pnl = clamp(pnlBase + pnlNoise, -0.6 * investmentUsd, expectedReturnUsd - investmentUsd)
    points.push({
      time: endDate,
      earnedUsd: Math.round(earnedUsd * 100) / 100,
      pnl: Math.round(pnl * 100) / 100,
      equity: Math.round((investmentUsd + pnl) * 100) / 100,
      stepIndex,
    })
  }

  return points
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
