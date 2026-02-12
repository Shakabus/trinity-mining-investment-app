import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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

    const latestActivity = await prisma.userActivityLog.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true },
    })

    return NextResponse.json(
      {
        latestActivityId: latestActivity?.id ?? null,
        latestActivityAt: latestActivity?.createdAt ?? null,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  } catch (error) {
    console.error('Fetch activity meta error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
