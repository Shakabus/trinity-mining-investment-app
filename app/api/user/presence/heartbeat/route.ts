import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

const NEW_SESSION_GAP_MS = 2 * 60 * 1000
const MAX_HEARTBEAT_SECONDS = 120

export async function POST() {
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

    if (
      user.lastSeenAt &&
      sessionStartedAt &&
      now.getTime() - user.lastSeenAt.getTime() <= NEW_SESSION_GAP_MS
    ) {
      const diffSeconds = Math.round((now.getTime() - user.lastSeenAt.getTime()) / 1000)
      incrementSeconds = Math.max(0, Math.min(MAX_HEARTBEAT_SECONDS, diffSeconds))
    } else {
      sessionStartedAt = now
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

