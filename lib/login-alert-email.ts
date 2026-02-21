import { prisma } from '@/lib/db'
import { sendLoginAlertEmail } from '@/lib/transactional-email'

const LOGIN_EMAIL_SENT_PREFIX = 'LoginAlertEmailSent:'
const LOGIN_EMAIL_DISPATCHING_PREFIX = 'LoginAlertEmailDispatching:'

type SendLoginAlertEmailOnceInput = {
  userId: number
  sessionId: string
  email?: string | null
  fullName?: string | null
  signedInAt: Date
  source: 'presence_heartbeat'
  location?: string | null
  ipMasked?: string | null
  device?: string | null
}

const normalizeEmail = (value: string) => value.trim().toLowerCase()

const sanitizeSessionId = (value: string) => value.trim().slice(0, 128)

const compactLine = (value: string, maxLength = 180) =>
  value.replace(/\s+/g, ' ').trim().slice(0, maxLength)

export async function sendLoginAlertEmailOnce({
  userId,
  sessionId,
  email,
  fullName,
  signedInAt,
  source,
  location,
  ipMasked,
  device,
}: SendLoginAlertEmailOnceInput) {
  const destination = email?.trim().toLowerCase()
  if (!destination) {
    return { sent: false, reason: 'missing_email' as const }
  }

  const safeSessionId = sanitizeSessionId(sessionId)
  if (!safeSessionId) {
    return { sent: false, reason: 'missing_session' as const }
  }

  const sentAction = `${LOGIN_EMAIL_SENT_PREFIX}${safeSessionId}`
  const dispatchAction = `${LOGIN_EMAIL_DISPATCHING_PREFIX}${safeSessionId}`
  let dispatchLogId: number | null = null

  const claimed = await prisma.$transaction(
    async tx => {
      await tx.$executeRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`

      const existing = await tx.userActivityLog.findFirst({
        where: {
          userId,
          action: {
            in: [sentAction, dispatchAction],
          },
        },
        select: { id: true },
      })

      if (existing) return false

      const dispatchLog = await tx.userActivityLog.create({
        data: {
          userId,
          action: dispatchAction,
          detail: `Login alert dispatch started via ${source}.`,
        },
        select: { id: true },
      })
      dispatchLogId = dispatchLog.id
      return true
    },
    { timeout: 20_000, maxWait: 5_000 }
  )

  if (!claimed || !dispatchLogId) {
    return { sent: false, reason: 'already_sent' as const }
  }

  const sent = await sendLoginAlertEmail({
    to: normalizeEmail(destination),
    fullName: fullName ?? null,
    signedInAt,
    location: location ? compactLine(location, 120) : null,
    ipMasked: ipMasked ? compactLine(ipMasked, 80) : null,
    device: device ? compactLine(device, 200) : null,
  })

  if (sent) {
    await prisma.userActivityLog.update({
      where: { id: dispatchLogId },
      data: {
        action: sentAction,
        detail: `Login alert email sent via ${source}.`,
      },
    })
    return { sent: true, reason: 'sent' as const }
  }

  await prisma.userActivityLog.delete({
    where: { id: dispatchLogId },
  })

  return { sent: false, reason: 'send_failed' as const }
}
