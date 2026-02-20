import { prisma } from '@/lib/db'
import { sendWelcomeEmail } from '@/lib/transactional-email'

const WELCOME_EMAIL_SENT_ACTION = 'WelcomeEmailSent'
const WELCOME_EMAIL_DISPATCHING_ACTION = 'WelcomeEmailDispatching'

type SendWelcomeEmailOnceInput = {
  userId: number
  email?: string | null
  fullName?: string | null
  source: 'dashboard_layout' | 'clerk_webhook'
}

export async function sendWelcomeEmailOnce({
  userId,
  email,
  fullName,
  source,
}: SendWelcomeEmailOnceInput) {
  const destination = email?.trim().toLowerCase()
  if (!destination) {
    return { sent: false, reason: 'missing_email' as const }
  }

  let dispatchLogId: number | null = null

  const claimed = await prisma.$transaction(
    async tx => {
      await tx.$executeRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`

      const existing = await tx.userActivityLog.findFirst({
        where: {
          userId,
          action: {
            in: [WELCOME_EMAIL_SENT_ACTION, WELCOME_EMAIL_DISPATCHING_ACTION],
          },
        },
        select: { id: true, action: true },
        orderBy: { createdAt: 'desc' },
      })

      if (existing) return false

      const dispatchLog = await tx.userActivityLog.create({
        data: {
          userId,
          action: WELCOME_EMAIL_DISPATCHING_ACTION,
          detail: `Welcome email dispatch started via ${source}.`,
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

  const sent = await sendWelcomeEmail({
    to: destination,
    fullName: fullName ?? null,
  })

  if (sent) {
    await prisma.userActivityLog.update({
      where: { id: dispatchLogId },
      data: {
        action: WELCOME_EMAIL_SENT_ACTION,
        detail: `Welcome email sent via ${source}.`,
      },
    })
    return { sent: true, reason: 'sent' as const }
  }

  await prisma.userActivityLog.delete({
    where: { id: dispatchLogId },
  })

  return { sent: false, reason: 'send_failed' as const }
}
