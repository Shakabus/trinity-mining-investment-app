import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

type AdminPushEvent = {
  id: string
  title: string
  body: string
  href: string
  attentionRequired: boolean
  createdAt: string
  category: 'account' | 'payments' | 'withdrawals' | 'support' | 'kyc' | 'users' | 'general'
  userId: number
  userLabel: string
}

const MAX_LIMIT = 120
const DEFAULT_LIMIT = 60
const MAX_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000

const WATCHED_ACTIVITY_ACTIONS = [
  'AccountFundingSubmitted',
  'AccountBalancePlanPurchaseSubmitted',
  'AccountBalanceTradingPurchaseSubmitted',
  'AccountBalanceWithdrawalRequested',
  'WithdrawalToAccountBalanceRequested',
  'TradingWithdrawalToAccountBalanceRequested',
  'ReferralWithdrawalToAccountBalanceRequested',
  'RealEstateBuyInSubmitted',
  'RealEstateWithdrawalRequested',
  'SupportTicketCreated',
  'SupportMessageSent',
  'KYCSubmitted',
  'PlanSelected',
  'TradingPlanSelected',
  'PlanUpgradeRequested',
  'WalletUpdated',
  'ProfileUpdated',
  'WalletConversionCompleted',
  'UserLoginLocation',
] as const

type WatchedAction = (typeof WATCHED_ACTIVITY_ACTIONS)[number]

function parseLimit(value: string | null) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(parsed)))
}

function parseSince(value: string | null) {
  if (!value) {
    return new Date(Date.now() - 5 * 60 * 1000)
  }

  const asNumber = Number(value)
  if (Number.isFinite(asNumber) && asNumber > 0) {
    const bounded = Math.max(asNumber, Date.now() - MAX_LOOKBACK_MS)
    return new Date(bounded)
  }

  const asDate = new Date(value)
  if (Number.isFinite(asDate.getTime())) {
    const boundedTime = Math.max(asDate.getTime(), Date.now() - MAX_LOOKBACK_MS)
    return new Date(boundedTime)
  }

  return new Date(Date.now() - 5 * 60 * 1000)
}

function userLabel(fullName: string | null, email: string) {
  const normalizedName = (fullName || '').trim()
  return normalizedName.length > 0 ? normalizedName : email
}

function trimDetail(detail: string | null) {
  if (!detail) return ''
  const cleaned = detail.trim().replace(/\s+/g, ' ')
  if (cleaned.length <= 180) return cleaned
  return `${cleaned.slice(0, 177)}...`
}

function mapActionToNotification(action: WatchedAction, detail: string | null) {
  const fallback = {
    title: 'User activity update',
    body: trimDetail(detail) || 'A user completed a new activity.',
    href: '/admin',
    attentionRequired: false,
    category: 'general' as const,
  }

  switch (action) {
    case 'AccountFundingSubmitted':
      return {
        title: 'Funding request submitted',
        body: trimDetail(detail) || 'A user submitted account funding proof.',
        href: '/admin/account-balance',
        attentionRequired: true,
        category: 'account' as const,
      }
    case 'AccountBalancePlanPurchaseSubmitted':
    case 'AccountBalanceTradingPurchaseSubmitted':
      return {
        title: 'Plan payment awaiting review',
        body: trimDetail(detail) || 'A user submitted a plan payment from account balance.',
        href: '/admin/payments',
        attentionRequired: true,
        category: 'payments' as const,
      }
    case 'AccountBalanceWithdrawalRequested':
      return {
        title: 'External withdrawal request',
        body: trimDetail(detail) || 'A user requested withdrawal from account balance.',
        href: '/admin/account-balance',
        attentionRequired: true,
        category: 'withdrawals' as const,
      }
    case 'WithdrawalToAccountBalanceRequested':
    case 'TradingWithdrawalToAccountBalanceRequested':
    case 'ReferralWithdrawalToAccountBalanceRequested':
    case 'RealEstateWithdrawalRequested':
      return {
        title: 'Earnings transfer request',
        body: trimDetail(detail) || 'A user requested transfer of earnings into account balance.',
        href: '/admin/withdrawals',
        attentionRequired: true,
        category: 'withdrawals' as const,
      }
    case 'RealEstateBuyInSubmitted':
      return {
        title: 'Real-estate buy-in submitted',
        body: trimDetail(detail) || 'A user submitted a real-estate buy-in request.',
        href: '/admin/real-estate',
        attentionRequired: true,
        category: 'payments' as const,
      }
    case 'SupportTicketCreated':
    case 'SupportMessageSent':
      return {
        title: 'New user support message',
        body: trimDetail(detail) || 'A user opened or updated a support ticket.',
        href: '/admin/settings',
        attentionRequired: true,
        category: 'support' as const,
      }
    case 'KYCSubmitted':
      return {
        title: 'KYC submission received',
        body: trimDetail(detail) || 'A user submitted KYC for review.',
        href: '/admin/kyc',
        attentionRequired: true,
        category: 'kyc' as const,
      }
    case 'PlanSelected':
    case 'TradingPlanSelected':
    case 'PlanUpgradeRequested':
      return {
        title: 'User plan activity',
        body: trimDetail(detail) || 'A user updated plan selection.',
        href: '/admin/payments',
        attentionRequired: false,
        category: 'payments' as const,
      }
    case 'WalletUpdated':
    case 'ProfileUpdated':
      return {
        title: 'User profile updated',
        body: trimDetail(detail) || 'A user updated profile or wallet details.',
        href: '/admin/users',
        attentionRequired: false,
        category: 'users' as const,
      }
    case 'WalletConversionCompleted':
      return {
        title: 'Wallet conversion completed',
        body: trimDetail(detail) || 'A user converted wallet assets.',
        href: '/admin/account-balance',
        attentionRequired: false,
        category: 'account' as const,
      }
    case 'UserLoginLocation':
      return {
        title: 'User login location update',
        body: trimDetail(detail) || 'A user login was recorded with location metadata.',
        href: '/admin/users',
        attentionRequired: false,
        category: 'users' as const,
      }
    default:
      return fallback
  }
}

async function requireAdminUser() {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) return null

  const adminUser = await prisma.user.findUnique({
    where: { clerkUserId },
    select: { id: true, role: true },
  })
  if (!adminUser || adminUser.role !== 'admin') return null
  return adminUser
}

export async function GET(request: Request) {
  try {
    const adminUser = await requireAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const since = parseSince(url.searchParams.get('since'))
    const limit = parseLimit(url.searchParams.get('limit'))

    const [activityRows, signupRows] = await Promise.all([
      prisma.userActivityLog.findMany({
        where: {
          createdAt: { gte: since },
          action: { in: [...WATCHED_ACTIVITY_ACTIONS] },
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit,
      }),
      prisma.user.findMany({
        where: {
          role: 'user',
          createdAt: { gte: since },
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: Math.min(25, limit),
      }),
    ])

    const activityEvents: AdminPushEvent[] = activityRows.map(row => {
      const mapped = mapActionToNotification(row.action as WatchedAction, row.detail)
      return {
        id: `ua-${row.id}`,
        title: mapped.title,
        body: `${userLabel(row.user.fullName, row.user.email)}: ${mapped.body}`,
        href: mapped.href,
        attentionRequired: mapped.attentionRequired,
        createdAt: row.createdAt.toISOString(),
        category: mapped.category,
        userId: row.user.id,
        userLabel: userLabel(row.user.fullName, row.user.email),
      }
    })

    const signupEvents: AdminPushEvent[] = signupRows.map(row => ({
      id: `signup-${row.id}`,
      title: 'New user registration',
      body: `${userLabel(row.fullName, row.email)} joined the platform.`,
      href: '/admin/users',
      attentionRequired: false,
      createdAt: row.createdAt.toISOString(),
      category: 'users',
      userId: row.id,
      userLabel: userLabel(row.fullName, row.email),
    }))

    const merged = [...activityEvents, ...signupEvents]
      .sort((a, b) => {
        const time = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        if (time !== 0) return time
        return b.id.localeCompare(a.id)
      })
      .slice(0, limit)

    return NextResponse.json(
      {
        events: merged,
        generatedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'private, max-age=0, no-cache' } }
    )
  } catch (error) {
    console.error('Admin push notifications feed error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
