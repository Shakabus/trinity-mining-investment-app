export const PAYMENT_REMINDER_TIMEOUT_MS = 60 * 60 * 1000

export function isPaymentReminderVisible(
  createdAt: Date | string | null | undefined,
  now: Date = new Date()
) {
  if (!createdAt) return false
  const createdAtMs = new Date(createdAt).getTime()
  if (!Number.isFinite(createdAtMs)) return false
  return now.getTime() - createdAtMs < PAYMENT_REMINDER_TIMEOUT_MS
}
