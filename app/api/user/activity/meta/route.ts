import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const ACTIVITY_META_CACHE_TTL_MS = 15000

type ActivityMetaCacheState = {
  expiresAt: number
  latestActivityId: number | null
  latestActivityAt: Date | null
}

const globalForActivityMeta = globalThis as unknown as {
  activityMetaCacheByUser: Map<number, ActivityMetaCacheState>
}

if (!globalForActivityMeta.activityMetaCacheByUser) {
  globalForActivityMeta.activityMetaCacheByUser = new Map()
}

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const nowMs = Date.now()
    const cached = globalForActivityMeta.activityMetaCacheByUser.get(user.id)
    if (cached && cached.expiresAt > nowMs) {
      return NextResponse.json(
        {
          latestActivityId: cached.latestActivityId,
          latestActivityAt: cached.latestActivityAt,
        },
        {
          headers: {
            'Cache-Control': 'private, max-age=0, no-cache',
          },
        },
      )
    }

    const latestActivity = await prisma.userActivityLog.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true },
    })

    globalForActivityMeta.activityMetaCacheByUser.set(user.id, {
      expiresAt: nowMs + ACTIVITY_META_CACHE_TTL_MS,
      latestActivityId: latestActivity?.id ?? null,
      latestActivityAt: latestActivity?.createdAt ?? null,
    })

    return NextResponse.json(
      {
        latestActivityId: latestActivity?.id ?? null,
        latestActivityAt: latestActivity?.createdAt ?? null,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=0, no-cache',
        },
      },
    )
  } catch (error) {
    console.error('Fetch activity meta error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
