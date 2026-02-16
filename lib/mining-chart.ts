const HOURS_IN_DAY = 24

export function resolvePlanDurationHours(selectedDurationDays?: number | null): number {
  const days = Number(selectedDurationDays)
  if (!Number.isFinite(days) || days <= 0) {
    return HOURS_IN_DAY
  }
  return Math.max(1, Math.round(days * HOURS_IN_DAY))
}

export function resolveElapsedPlanHours(
  startDate: Date | string | null | undefined,
  now: Date = new Date()
): number {
  if (!startDate) return 1
  const startMs = new Date(startDate).getTime()
  const elapsedMs = Math.max(0, now.getTime() - startMs)
  return Math.max(1, elapsedMs / (1000 * 60 * 60))
}

export function resolveChartWindowHours(planDurationHours: number, elapsedPlanHours: number): number {
  return Math.max(1, Math.min(planDurationHours, elapsedPlanHours))
}

export function buildChartSampleOffsets(windowHours: number, maxPoints = 24): number[] {
  const safeWindowHours = Math.max(1, windowHours)
  const pointCount = Math.min(maxPoints, Math.max(2, Math.ceil(safeWindowHours) + 1))
  if (pointCount <= 2) {
    return [0, safeWindowHours]
  }

  const step = safeWindowHours / (pointCount - 1)
  return Array.from({ length: pointCount }, (_, index) => Number((index * step).toFixed(4)))
}

export function buildCycleSegments(windowHours: number, maxSegments = 8): Array<{
  startHour: number
  endHour: number
  midHour: number
}> {
  const safeWindowHours = Math.max(1, windowHours)
  const segmentCount = Math.min(maxSegments, Math.max(2, Math.ceil(safeWindowHours / 6)))
  const segmentSize = safeWindowHours / segmentCount

  return Array.from({ length: segmentCount }, (_, index) => {
    const startHour = index * segmentSize
    const endHour = (index + 1) * segmentSize
    return {
      startHour,
      endHour,
      midHour: (startHour + endHour) / 2,
    }
  })
}

export function formatCycleProgressLabel(elapsedHours: number, planDurationHours: number): string {
  const safeElapsed = Math.max(0, elapsedHours)
  if (planDurationHours <= HOURS_IN_DAY) {
    return `${Math.round(safeElapsed)}h`
  }

  const day = Math.floor(safeElapsed / HOURS_IN_DAY) + 1
  const hour = Math.round(safeElapsed % HOURS_IN_DAY)
  return hour === 0 ? `D${day}` : `D${day} ${hour}h`
}

export function formatChartWindowLabel(windowHours: number): string {
  const rounded = Math.max(1, Math.round(windowHours))
  if (rounded % HOURS_IN_DAY === 0) {
    const days = rounded / HOURS_IN_DAY
    return days === 1 ? '24h' : `${days}d`
  }
  return `${rounded}h`
}

