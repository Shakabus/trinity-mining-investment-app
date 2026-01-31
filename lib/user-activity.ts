import { prisma } from '@/lib/db'

export async function logUserActivity(options: {
  userId: number
  action: string
  detail?: string | null
}) {
  try {
    await prisma.userActivityLog.create({
      data: {
        userId: options.userId,
        action: options.action,
        detail: options.detail ?? null,
      },
    })
  } catch (error) {
    console.error('User activity log error:', error)
  }
}
