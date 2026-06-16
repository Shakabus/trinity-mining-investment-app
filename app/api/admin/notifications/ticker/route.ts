import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getFinancialNewsTickerItems } from '@/lib/financial-news'
import {
  parseTickerLimit,
  type NotificationTickerItem,
} from '@/lib/notification-ticker'

export const dynamic = 'force-dynamic'

const ADMIN_TICKER_CACHE_TTL_MS = 20000

type AdminTickerCacheState = {
  expiresAt: number
  sortedItems: NotificationTickerItem[]
  generatedAt: string
}

const globalForAdminTicker = globalThis as unknown as {
  adminTickerCache: AdminTickerCacheState | null
  adminTickerInFlight: Promise<AdminTickerCacheState> | null
}

if (!globalForAdminTicker.adminTickerCache) {
  globalForAdminTicker.adminTickerCache = null
}
if (!globalForAdminTicker.adminTickerInFlight) {
  globalForAdminTicker.adminTickerInFlight = null
}

async function requireAdminUser() {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) return null
  const user = await prisma.user.findUnique({
    where: { clerkUserId },
    select: { id: true, role: true },
  })
  if (!user || user.role !== 'admin') return null
  return user
}

async function buildAdminTickerState(): Promise<AdminTickerCacheState> {
  const financialNewsItems = await getFinancialNewsTickerItems(16)
  const items: NotificationTickerItem[] = financialNewsItems.map(item => ({
    ...item,
    id: `admin-${item.id}`,
    href: '/admin',
  }))

  return {
    expiresAt: Date.now() + ADMIN_TICKER_CACHE_TTL_MS,
    sortedItems: items.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    generatedAt: new Date().toISOString(),
  }
}

export async function GET(request: Request) {
  try {
    const adminUser = await requireAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const limit = parseTickerLimit(url.searchParams.get('limit'))
    const nowMs = Date.now()

    const cached = globalForAdminTicker.adminTickerCache
    if (cached && cached.expiresAt > nowMs) {
      return NextResponse.json(
        { items: cached.sortedItems.slice(0, limit), generatedAt: cached.generatedAt },
        { headers: { 'Cache-Control': 'private, max-age=0, no-cache' } },
      )
    }

    if (!globalForAdminTicker.adminTickerInFlight) {
      globalForAdminTicker.adminTickerInFlight = buildAdminTickerState().finally(() => {
        globalForAdminTicker.adminTickerInFlight = null
      })
    }

    const fresh = await globalForAdminTicker.adminTickerInFlight
    globalForAdminTicker.adminTickerCache = fresh

    return NextResponse.json(
      { items: fresh.sortedItems.slice(0, limit), generatedAt: fresh.generatedAt },
      { headers: { 'Cache-Control': 'private, max-age=0, no-cache' } },
    )
  } catch (error) {
    console.error('Admin notification ticker error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
