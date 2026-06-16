import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { dismissPlanProceedsAlert } from '@/lib/plan-proceeds-alert'

const DEFAULT_NEXT_PATH = '/dashboard'

const isSafeNextPath = (value: string) => value.startsWith('/') && !value.startsWith('//')

export async function GET(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      const signInUrl = new URL('/sign-in', req.url)
      return NextResponse.redirect(signInUrl)
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    })

    if (!user) {
      const signInUrl = new URL('/sign-in', req.url)
      return NextResponse.redirect(signInUrl)
    }

    const url = new URL(req.url)
    const nextRaw = (url.searchParams.get('next') || '').trim()
    const markerRaw = (url.searchParams.get('marker') || '').trim()
    const nextPath = isSafeNextPath(nextRaw) ? nextRaw : DEFAULT_NEXT_PATH

    await dismissPlanProceedsAlert({
      userId: user.id,
      marker: markerRaw || undefined,
      source: 'api_redirect',
    })

    return NextResponse.redirect(new URL(nextPath, req.url))
  } catch (error) {
    console.error('Dismiss plan proceeds alert error:', error)
    return NextResponse.redirect(new URL(DEFAULT_NEXT_PATH, req.url))
  }
}

