import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  ACCOUNT_BALANCE_ENTRY_ACTION,
  formatAccountBalanceSource,
  parseAccountBalanceEntryDetail,
} from '@/lib/account-balance'
import { getFinancialNewsTickerItems } from '@/lib/financial-news'
import { REAL_ESTATE_BUY_IN_TICKET_PREFIX } from '@/lib/real-estate-dashboard'
import {
  normalizeTickerText,
  parseRealEstateDurationMonths,
  parseTickerLimit,
  type NotificationTickerItem,
  TICKER_MATURITY_SOON_WINDOW_MS,
} from '@/lib/notification-ticker'

export const dynamic = 'force-dynamic'

const USER_TICKER_CACHE_TTL_MS = 20000

type UserTickerCacheState = {
  expiresAt: number
  sortedItems: NotificationTickerItem[]
  generatedAt: string
}

type UserActivityRow = {
  id: number
  action: string
  detail: string | null
  createdAt: Date
}

const globalForUserTicker = globalThis as unknown as {
  userTickerCacheByUser: Map<number, UserTickerCacheState>
  userTickerInFlightByUser: Map<number, Promise<UserTickerCacheState>>
}

if (!globalForUserTicker.userTickerCacheByUser) {
  globalForUserTicker.userTickerCacheByUser = new Map()
}
if (!globalForUserTicker.userTickerInFlightByUser) {
  globalForUserTicker.userTickerInFlightByUser = new Map()
}

function mapUserActivity(entry: UserActivityRow): NotificationTickerItem {
  if (entry.action === ACCOUNT_BALANCE_ENTRY_ACTION) {
    const parsed = parseAccountBalanceEntryDetail(entry.detail)
    if (parsed) {
      const sourceLabel = formatAccountBalanceSource(parsed.source)
      const statusLabel =
        parsed.status === 'pending' ? 'pending review' : parsed.status === 'rejected' ? 'rejected' : 'confirmed'
      const tone =
        parsed.status === 'rejected'
          ? 'danger'
          : parsed.status === 'pending'
            ? 'warning'
            : parsed.direction === 'credit'
              ? 'success'
              : 'info'

      return {
        id: `activity-${entry.id}`,
        text: normalizeTickerText(
          `${parsed.direction === 'credit' ? 'Account credit' : 'Account debit'}: $${parsed.amountUsd.toFixed(2)} via ${sourceLabel} (${statusLabel}).`,
        ),
        tone,
        createdAt: entry.createdAt.toISOString(),
        href: '/dashboard/account',
      }
    }
  }

  const detail = normalizeTickerText(entry.detail || '')
  const fallback = normalizeTickerText(entry.action.replace(/[_-]+/g, ' '))
  return {
    id: `activity-${entry.id}`,
    text: detail || `Account activity: ${fallback}.`,
    tone: 'info',
    createdAt: entry.createdAt.toISOString(),
    href: '/dashboard/activity',
  }
}

async function buildUserTickerState(userId: number): Promise<UserTickerCacheState> {
  const now = new Date()
  const soonCutoff = new Date(now.getTime() + TICKER_MATURITY_SOON_WINDOW_MS)

  const [activityRows, supportReplies, miningPlans, tradingPlans, realEstateTickets] = await Promise.all([
    prisma.userActivityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 40,
      select: {
        id: true,
        action: true,
        detail: true,
        createdAt: true,
      },
    }),
    prisma.supportMessage.findMany({
      where: {
        senderRole: 'support',
        ticket: { userId },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        createdAt: true,
        ticket: {
          select: {
            id: true,
            subject: true,
          },
        },
      },
    }),
    prisma.userPlan.findMany({
      where: {
        userId,
        paymentStatus: 'confirmed',
        status: { in: ['active', 'completed'] },
        endDate: { not: null },
      },
      orderBy: { endDate: 'asc' },
      take: 24,
      select: {
        id: true,
        endDate: true,
        plan: { select: { name: true } },
      },
    }),
    prisma.tradingUserPlan.findMany({
      where: {
        userId,
        paymentStatus: 'confirmed',
        status: { in: ['active', 'completed'] },
        endDate: { not: null },
      },
      orderBy: { endDate: 'asc' },
      take: 24,
      select: {
        id: true,
        endDate: true,
        plan: { select: { name: true } },
      },
    }),
    prisma.supportTicket.findMany({
      where: {
        userId,
        subject: { startsWith: REAL_ESTATE_BUY_IN_TICKET_PREFIX },
        status: 'closed',
      },
      orderBy: { updatedAt: 'desc' },
      take: 16,
      select: {
        id: true,
        updatedAt: true,
        subject: true,
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
  items.push(...activityRows.map(mapUserActivity))

  for (const message of supportReplies) {
    items.push({
      id: `support-${message.id}`,
      text: normalizeTickerText(`New support message: ${message.ticket.subject}.`),
      tone: 'info',
      createdAt: message.createdAt.toISOString(),
      href: '/dashboard/support',
    })
  }

  for (const plan of miningPlans) {
    if (!plan.endDate || plan.endDate > soonCutoff) continue
    const hoursLeft = Math.max(0, Math.ceil((plan.endDate.getTime() - now.getTime()) / (60 * 60 * 1000)))
    const isMatured = plan.endDate <= now
    items.push({
      id: `mining-maturity-${plan.id}`,
      text: isMatured
        ? normalizeTickerText(`Mining cycle matured: ${plan.plan.name}. Proceed to withdrawals.`)
        : normalizeTickerText(`Mining cycle nearing maturity: ${plan.plan.name} (${hoursLeft}h remaining).`),
      tone: isMatured ? 'success' : 'warning',
      createdAt: plan.endDate.toISOString(),
      href: '/dashboard/my-plan',
    })
  }

  for (const plan of tradingPlans) {
    if (!plan.endDate || plan.endDate > soonCutoff) continue
    const hoursLeft = Math.max(0, Math.ceil((plan.endDate.getTime() - now.getTime()) / (60 * 60 * 1000)))
    const isMatured = plan.endDate <= now
    items.push({
      id: `trading-maturity-${plan.id}`,
      text: isMatured
        ? normalizeTickerText(`Trading cycle matured: ${plan.plan.name}. Payout is now due.`)
        : normalizeTickerText(`Trading cycle nearing maturity: ${plan.plan.name} (${hoursLeft}h remaining).`),
      tone: isMatured ? 'success' : 'warning',
      createdAt: plan.endDate.toISOString(),
      href: '/dashboard/investment-trading',
    })
  }

  for (const ticket of realEstateTickets) {
    const body = ticket.messages[0]?.body || ''
    const months = parseRealEstateDurationMonths(body)
    if (!months) continue

    const maturityDate = new Date(ticket.updatedAt.getTime())
    maturityDate.setMonth(maturityDate.getMonth() + months)
    if (maturityDate > soonCutoff) continue

    const hoursLeft = Math.max(0, Math.ceil((maturityDate.getTime() - now.getTime()) / (60 * 60 * 1000)))
    const isMatured = maturityDate <= now
    const propertyName =
      normalizeTickerText(ticket.subject.replace(REAL_ESTATE_BUY_IN_TICKET_PREFIX, '')) || 'Real-estate allocation'

    items.push({
      id: `real-estate-maturity-${ticket.id}`,
      text: isMatured
        ? normalizeTickerText(`Real-estate position matured: ${propertyName}. Withdrawal window is open.`)
        : normalizeTickerText(`Real-estate position nearing maturity: ${propertyName} (${hoursLeft}h remaining).`),
      tone: isMatured ? 'success' : 'warning',
      createdAt: maturityDate.toISOString(),
      href: '/dashboard/real-estate/my-properties',
    })
  }

  const financialNewsItems = await getFinancialNewsTickerItems(16)
  for (const item of financialNewsItems) {
    items.push({
      ...item,
      id: `user-${item.id}`,
      href: '/dashboard/activity',
    })
  }

  const deduped = new Map<string, NotificationTickerItem>()
  for (const item of items) {
    if (!deduped.has(item.id)) {
      deduped.set(item.id, item)
    }
  }

  return {
    expiresAt: Date.now() + USER_TICKER_CACHE_TTL_MS,
    sortedItems: [...deduped.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    generatedAt: new Date().toISOString(),
  }
}

export async function GET(request: Request) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const url = new URL(request.url)
    const limit = parseTickerLimit(url.searchParams.get('limit'))
    const nowMs = Date.now()

    const cached = globalForUserTicker.userTickerCacheByUser.get(user.id)
    if (cached && cached.expiresAt > nowMs) {
      return NextResponse.json(
        { items: cached.sortedItems.slice(0, limit), generatedAt: cached.generatedAt },
        { headers: { 'Cache-Control': 'private, max-age=0, no-cache' } },
      )
    }

    let inFlight = globalForUserTicker.userTickerInFlightByUser.get(user.id)
    if (!inFlight) {
      inFlight = buildUserTickerState(user.id).finally(() => {
        globalForUserTicker.userTickerInFlightByUser.delete(user.id)
      })
      globalForUserTicker.userTickerInFlightByUser.set(user.id, inFlight)
    }

    const fresh = await inFlight
    globalForUserTicker.userTickerCacheByUser.set(user.id, fresh)

    return NextResponse.json(
      { items: fresh.sortedItems.slice(0, limit), generatedAt: fresh.generatedAt },
      { headers: { 'Cache-Control': 'private, max-age=0, no-cache' } },
    )
  } catch (error) {
    console.error('User notification ticker error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
