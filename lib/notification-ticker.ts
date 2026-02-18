export type NotificationTickerTone = 'info' | 'success' | 'warning' | 'danger'

export type NotificationTickerItem = {
  id: string
  text: string
  tone: NotificationTickerTone
  createdAt: string
  href?: string
}

export const TICKER_DEFAULT_LIMIT = 36
export const TICKER_MAX_LIMIT = 80
export const TICKER_MATURITY_SOON_WINDOW_MS = 24 * 60 * 60 * 1000

export function normalizeTickerText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

export function parseTickerLimit(raw: string | null) {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) return TICKER_DEFAULT_LIMIT
  return Math.min(TICKER_MAX_LIMIT, Math.floor(parsed))
}

export function resolveUserDisplayName(
  fullName: string | null | undefined,
  email: string | null | undefined,
  userId: number,
) {
  const cleanedName = (fullName || '').trim()
  if (cleanedName.length > 0) return cleanedName
  const cleanedEmail = (email || '').trim()
  if (cleanedEmail.length > 0) return cleanedEmail
  return `User #${userId}`
}

export function parseRealEstateDurationMonths(body: string) {
  const durationMatch = body.match(/^Duration:\s*(.+)$/im)
  if (!durationMatch) return null
  const monthsMatch = durationMatch[1].match(/(\d+)\s*month/i)
  if (!monthsMatch) return null
  const months = Number(monthsMatch[1])
  if (!Number.isFinite(months) || months <= 0) return null
  return months
}

