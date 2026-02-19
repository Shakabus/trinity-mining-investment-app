import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { REAL_ESTATE_BUY_IN_TICKET_PREFIX } from '@/lib/real-estate-dashboard'
import {
  normalizeTickerText,
  parseRealEstateDurationMonths,
  parseTickerLimit,
  resolveUserDisplayName,
  type NotificationTickerItem,
  TICKER_MATURITY_SOON_WINDOW_MS,
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
  const now = new Date()
  const soonCutoff = new Date(now.getTime() + TICKER_MATURITY_SOON_WINDOW_MS)

  const [
    pendingMiningPlans,
    pendingTradingPlans,
    supportMessages,
    recentActivity,
    miningDueSoonPlans,
    tradingDueSoonPlans,
    realEstateApprovedTickets,
  ] = await Promise.all([
    prisma.userPlan.findMany({
      where: {
        status: 'awaiting_payment',
        paymentStatus: 'pending',
      },
      orderBy: { updatedAt: 'desc' },
      take: 24,
      select: {
        id: true,
        updatedAt: true,
        plan: { select: { name: true } },
        user: { select: { id: true, fullName: true, email: true } },
      },
    }),
    prisma.tradingUserPlan.findMany({
      where: {
        status: { in: ['awaiting_payment', 'selected'] },
        paymentStatus: 'pending',
      },
      orderBy: { updatedAt: 'desc' },
      take: 24,
      select: {
        id: true,
        updatedAt: true,
        plan: { select: { name: true } },
        user: { select: { id: true, fullName: true, email: true } },
      },
    }),
    prisma.supportMessage.findMany({
      where: { senderRole: 'user' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        createdAt: true,
        ticket: {
          select: {
            id: true,
            subject: true,
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    }),
    prisma.userActivityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 28,
      select: {
        id: true,
        action: true,
        detail: true,
        createdAt: true,
        user: { select: { id: true, fullName: true, email: true } },
      },
    }),
    prisma.userPlan.findMany({
      where: {
        paymentStatus: 'confirmed',
        status: { in: ['active', 'completed'] },
        endDate: { not: null },
      },
      orderBy: { endDate: 'asc' },
      take: 80,
      select: {
        id: true,
        endDate: true,
        plan: { select: { name: true } },
        user: { select: { id: true, fullName: true, email: true } },
      },
    }),
    prisma.tradingUserPlan.findMany({
      where: {
        paymentStatus: 'confirmed',
        status: { in: ['active', 'completed'] },
        endDate: { not: null },
      },
      orderBy: { endDate: 'asc' },
      take: 80,
      select: {
        id: true,
        endDate: true,
        plan: { select: { name: true } },
        user: { select: { id: true, fullName: true, email: true } },
      },
    }),
    prisma.supportTicket.findMany({
      where: {
        subject: { startsWith: REAL_ESTATE_BUY_IN_TICKET_PREFIX },
        status: 'closed',
      },
      orderBy: { updatedAt: 'desc' },
      take: 40,
      select: {
        id: true,
        updatedAt: true,
        subject: true,
        user: { select: { id: true, fullName: true, email: true } },
        messages: {
          where: { senderRole: 'user' },
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { body: true },
        },
      },
    }),
  ])

  const items: NotificationTickerItem[] = []

  for (const plan of pendingMiningPlans) {
    const userName = resolveUserDisplayName(plan.user.fullName, plan.user.email, plan.user.id)
    items.push({
      id: `admin-pending-mining-${plan.id}`,
      text: normalizeTickerText(`Pending mining payment: ${userName} - ${plan.plan.name}.`),
      tone: 'warning',
      createdAt: plan.updatedAt.toISOString(),
      href: '/admin/payments',
    })
  }

  for (const plan of pendingTradingPlans) {
    const userName = resolveUserDisplayName(plan.user.fullName, plan.user.email, plan.user.id)
    items.push({
      id: `admin-pending-trading-${plan.id}`,
      text: normalizeTickerText(`Pending trading payment: ${userName} - ${plan.plan.name}.`),
      tone: 'warning',
      createdAt: plan.updatedAt.toISOString(),
      href: '/admin/payments',
    })
  }

  for (const message of supportMessages) {
    const userName = resolveUserDisplayName(
      message.ticket.user.fullName,
      message.ticket.user.email,
      message.ticket.user.id,
    )
    items.push({
      id: `admin-support-message-${message.id}`,
      text: normalizeTickerText(`New support message from ${userName}: ${message.ticket.subject}.`),
      tone: 'info',
      createdAt: message.createdAt.toISOString(),
      href: '/admin/settings',
    })
  }

  for (const entry of recentActivity) {
    const userName = resolveUserDisplayName(entry.user.fullName, entry.user.email, entry.user.id)
    const detail = normalizeTickerText(entry.detail || '')
    const action = normalizeTickerText(entry.action.replace(/[_-]+/g, ' '))
    items.push({
      id: `admin-activity-${entry.id}`,
      text: detail || `${userName} activity: ${action}.`,
      tone: 'info',
      createdAt: entry.createdAt.toISOString(),
      href: `/admin/users/${entry.user.id}`,
    })
  }

  for (const plan of miningDueSoonPlans) {
    if (!plan.endDate || plan.endDate > soonCutoff) continue
    const isMatured = plan.endDate <= now
    const userName = resolveUserDisplayName(plan.user.fullName, plan.user.email, plan.user.id)
    const hoursLeft = Math.max(0, Math.ceil((plan.endDate.getTime() - now.getTime()) / (60 * 60 * 1000)))
    items.push({
      id: `admin-mining-maturity-${plan.id}`,
      text: isMatured
        ? normalizeTickerText(`Mining payout due: ${userName} - ${plan.plan.name} is matured.`)
        : normalizeTickerText(`Mining payout nearing maturity: ${userName} - ${plan.plan.name} (${hoursLeft}h).`),
      tone: isMatured ? 'success' : 'warning',
      createdAt: plan.endDate.toISOString(),
      href: '/admin',
    })
  }

  for (const plan of tradingDueSoonPlans) {
    if (!plan.endDate || plan.endDate > soonCutoff) continue
    const isMatured = plan.endDate <= now
    const userName = resolveUserDisplayName(plan.user.fullName, plan.user.email, plan.user.id)
    const hoursLeft = Math.max(0, Math.ceil((plan.endDate.getTime() - now.getTime()) / (60 * 60 * 1000)))
    items.push({
      id: `admin-trading-maturity-${plan.id}`,
      text: isMatured
        ? normalizeTickerText(`Trading payout due: ${userName} - ${plan.plan.name} is matured.`)
        : normalizeTickerText(`Trading payout nearing maturity: ${userName} - ${plan.plan.name} (${hoursLeft}h).`),
      tone: isMatured ? 'success' : 'warning',
      createdAt: plan.endDate.toISOString(),
      href: '/admin',
    })
  }

  for (const ticket of realEstateApprovedTickets) {
    const months = parseRealEstateDurationMonths(ticket.messages[0]?.body || '')
    if (!months) continue

    const maturityDate = new Date(ticket.updatedAt.getTime())
    maturityDate.setMonth(maturityDate.getMonth() + months)
    if (maturityDate > soonCutoff) continue

    const userName = resolveUserDisplayName(ticket.user.fullName, ticket.user.email, ticket.user.id)
    const propertyName =
      normalizeTickerText(ticket.subject.replace(REAL_ESTATE_BUY_IN_TICKET_PREFIX, '')) || 'Real-estate position'
    const isMatured = maturityDate <= now
    const hoursLeft = Math.max(0, Math.ceil((maturityDate.getTime() - now.getTime()) / (60 * 60 * 1000)))

    items.push({
      id: `admin-real-estate-maturity-${ticket.id}`,
      text: isMatured
        ? normalizeTickerText(`Real-estate payout due: ${userName} - ${propertyName} reached maturity.`)
        : normalizeTickerText(`Real-estate maturity soon: ${userName} - ${propertyName} (${hoursLeft}h).`),
      tone: isMatured ? 'success' : 'warning',
      createdAt: maturityDate.toISOString(),
      href: '/admin/settings',
    })
  }

  const deduped = new Map<string, NotificationTickerItem>()
  for (const item of items) {
    if (!deduped.has(item.id)) {
      deduped.set(item.id, item)
    }
  }

  return {
    expiresAt: Date.now() + ADMIN_TICKER_CACHE_TTL_MS,
    sortedItems: [...deduped.values()].sort(
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
