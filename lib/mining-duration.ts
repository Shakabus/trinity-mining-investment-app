export function formatPlanDurationLabel(durationDays: number) {
  const safeDays = Number.isFinite(durationDays) ? Math.max(0, durationDays) : 0
  const totalHours = Math.round(safeDays * 24)

  if (totalHours <= 0) {
    return '0 hours'
  }

  // Mining plans are now short-cycle (24-96h), so present duration in hours.
  if (totalHours <= 168) {
    return `${totalHours} hours`
  }

  return `${safeDays} days`
}

export function formatRemainingPlanTime(endDate: Date, now = new Date()) {
  const diffMs = endDate.getTime() - now.getTime()
  if (diffMs <= 0) {
    return 'Completed'
  }

  const remainingHours = Math.ceil(diffMs / (1000 * 60 * 60))
  if (remainingHours <= 168) {
    return `${remainingHours} hours`
  }

  const remainingDays = Math.ceil(remainingHours / 24)
  return `${remainingDays} days`
}
