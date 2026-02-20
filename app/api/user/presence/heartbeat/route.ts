import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import {
  buildLocationEventDetail,
  extractApproxLocation,
  hasApproxLocationData,
  locationSignature,
  parseLocationEventDetail,
} from '@/lib/location-tracking'
import { logUserActivity } from '@/lib/user-activity'

const NEW_SESSION_GAP_MS = 2 * 60 * 1000
const MAX_HEARTBEAT_SECONDS = 120
const LOCATION_DEDUPE_WINDOW_MS = 30 * 60 * 1000

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: {
        id: true,
        lastSeenAt: true,
        currentSessionStartedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let sessionStartedAt = user.currentSessionStartedAt
    let incrementSeconds = 0
    let startedNewSession = false

    if (
      user.lastSeenAt &&
      sessionStartedAt &&
      now.getTime() - user.lastSeenAt.getTime() <= NEW_SESSION_GAP_MS
    ) {
      const diffSeconds = Math.round((now.getTime() - user.lastSeenAt.getTime()) / 1000)
      incrementSeconds = Math.max(0, Math.min(MAX_HEARTBEAT_SECONDS, diffSeconds))
    } else {
      sessionStartedAt = now
      startedNewSession = true
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        lastSeenAt: now,
        currentSessionStartedAt: sessionStartedAt,
        totalSessionSeconds: {
          increment: incrementSeconds,
        },
      },
      select: {
        lastSeenAt: true,
        currentSessionStartedAt: true,
        totalSessionSeconds: true,
      },
    })

    if (startedNewSession) {
      const snapshot = extractApproxLocation(req.headers)
      if (hasApproxLocationData(snapshot)) {
        const latestLocationLog = await prisma.userActivityLog.findFirst({
          where: {
            userId: user.id,
            action: 'UserLoginLocation',
          },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true, detail: true },
        })
        const latestParsed = parseLocationEventDetail(latestLocationLog?.detail)
        const latestAgeMs = latestLocationLog
          ? now.getTime() - new Date(latestLocationLog.createdAt).getTime()
          : Number.POSITIVE_INFINITY
        const isRecentDuplicate =
          Boolean(latestLocationLog) &&
          latestAgeMs <= LOCATION_DEDUPE_WINDOW_MS &&
          latestParsed &&
          locationSignature(latestParsed) === locationSignature(snapshot)

        if (!isRecentDuplicate) {
          await logUserActivity({
            userId: user.id,
            action: 'UserLoginLocation',
            detail: buildLocationEventDetail({
              event: 'login',
              source: 'presence_heartbeat',
              location: snapshot,
              capturedAt: now,
            }),
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      lastSeenAt: updated.lastSeenAt?.toISOString() ?? null,
      currentSessionStartedAt: updated.currentSessionStartedAt?.toISOString() ?? null,
      totalSessionSeconds: updated.totalSessionSeconds,
    })
  } catch (error) {
    console.error('Presence heartbeat error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

