import { prisma } from '@/lib/db'

const PLAN_PROCEEDS_ALERT_DISMISSED_ACTION = 'PlanProceedsAlertDismissed'

type CompletionSnapshot = {
  id: number
  updatedAt: Date
}

type DismissPayload = {
  marker?: string
}

const parseDismissPayload = (detail: string | null) => {
  if (!detail) return null
  try {
    const parsed = JSON.parse(detail) as DismissPayload
    const marker = typeof parsed.marker === 'string' ? parsed.marker.trim() : ''
    return marker ? marker : null
  } catch {
    return null
  }
}

const buildMarker = (mining: CompletionSnapshot | null, trading: CompletionSnapshot | null) => {
  if (!mining && !trading) return null
  const miningPart = mining ? `${mining.id}:${mining.updatedAt.toISOString()}` : '-'
  const tradingPart = trading ? `${trading.id}:${trading.updatedAt.toISOString()}` : '-'
  return `m=${miningPart}|t=${tradingPart}`
}

export async function resolveCurrentPlanProceedsMarker(userId: number) {
  const [latestMiningCompletion, latestTradingCompletion] = await Promise.all([
    prisma.userPlan.findFirst({
      where: {
        userId,
        status: 'completed',
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, updatedAt: true },
    }),
    prisma.tradingUserPlan.findFirst({
      where: {
        userId,
        status: 'completed',
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, updatedAt: true },
    }),
  ])

  return buildMarker(latestMiningCompletion, latestTradingCompletion)
}

export async function getPlanProceedsAlertState(userId: number) {
  const marker = await resolveCurrentPlanProceedsMarker(userId)
  if (!marker) {
    return { marker: null, visible: false as const }
  }

  const latestDismissLog = await prisma.userActivityLog.findFirst({
    where: {
      userId,
      action: PLAN_PROCEEDS_ALERT_DISMISSED_ACTION,
    },
    orderBy: { createdAt: 'desc' },
    select: { detail: true },
  })

  const dismissedMarker = parseDismissPayload(latestDismissLog?.detail ?? null)

  return {
    marker,
    visible: dismissedMarker !== marker,
  }
}

export async function dismissPlanProceedsAlert(args: {
  userId: number
  marker?: string | null
  source: 'dashboard' | 'account_withdraw' | 'api_redirect'
}) {
  const marker = args.marker?.trim() || (await resolveCurrentPlanProceedsMarker(args.userId))
  if (!marker) {
    return { dismissed: false as const, marker: null }
  }

  await prisma.userActivityLog.create({
    data: {
      userId: args.userId,
      action: PLAN_PROCEEDS_ALERT_DISMISSED_ACTION,
      detail: JSON.stringify({
        marker,
        source: args.source,
        dismissedAt: new Date().toISOString(),
      }),
    },
  })

  return { dismissed: true as const, marker }
}

