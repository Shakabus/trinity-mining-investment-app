import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateMarketingLiveFeed, type MarketingLiveFeedItem } from '@/components/marketing/marketingLiveFeed'

export const dynamic = 'force-dynamic'

const PAYMENT_APPROVAL_ACTIONS = new Set([
  'PaymentApproved',
  'TradingPaymentApproved',
  'RealEstateBuyInApproved',
])
const WITHDRAWAL_ACTIONS = new Set([
  'WithdrawalUpdated',
  'TradingWithdrawalUpdated',
  'ReferralWithdrawalUpdated',
  'RealEstateWithdrawalPaid',
])
const TRACKED_ACTIONS = new Set([...PAYMENT_APPROVAL_ACTIONS, ...WITHDRAWAL_ACTIONS])

const DEFAULT_LIMIT = 40
const MAX_LIMIT = 120
const VISIBILITY_DELAY_MS = 7000
const SYNTHETIC_POOL_SIZE = 2000
const SYNTHETIC_SHIFT_MS = 2000

type LiveActivityItem = {
  id: string
  name: string
  country: string
  action: string
  value: string
  tone: 'deposit' | 'withdrawal' | 'plan'
  createdAt: string
  source: 'approved' | 'generated'
}

function formatMemberName(fullName: string | null, email: string | null, userId: number) {
  if (fullName && fullName.trim().length > 0) {
    return fullName.trim()
  }
  if (email && email.includes('@')) {
    const local = email.split('@')[0]
    if (local.length > 1) {
      return `${local[0].toUpperCase()}${local.slice(1)}`
    }
  }
  return `Member ${String(userId).padStart(4, '0')}`
}

function extractValue(detail: string | null, action: string) {
  if (!detail) {
    return action === 'RealEstateBuyInApproved' ? 'Real estate buy-in' : 'Investment payment'
  }

  const planMatch = detail.match(/for\s+(.+?)\./i)
  if (planMatch?.[1]) {
    return planMatch[1]
  }
  if (action === 'RealEstateBuyInApproved') {
    return 'Real estate buy-in'
  }
  return 'Investment payment'
}

function extractWithdrawalValue(detail: string | null) {
  if (!detail) return 'Payout released'

  const amountMatch = detail.match(/\$[\d,]+(?:\.\d+)?/)
  if (amountMatch?.[0]) return amountMatch[0]

  return 'Payout released'
}

function buildSyntheticWindow(limit: number, nowMs: number): MarketingLiveFeedItem[] {
  const pool = generateMarketingLiveFeed(SYNTHETIC_POOL_SIZE, 817234)
  if (!pool.length) return []

  const cursor = Math.floor(nowMs / SYNTHETIC_SHIFT_MS) % pool.length
  const items: MarketingLiveFeedItem[] = []

  for (let index = 0; index < limit; index += 1) {
    const base = pool[(cursor + index) % pool.length]
    items.push({
      ...base,
      id: `generated-${cursor}-${index}-${base.id}`,
    })
  }

  return items
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const requestedLimit = Number(searchParams.get('limit') || DEFAULT_LIMIT)
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(MAX_LIMIT, Math.floor(requestedLimit)))
      : DEFAULT_LIMIT

    const visibleCutoff = new Date(Date.now() - VISIBILITY_DELAY_MS)
    const since = new Date(Date.now() - 1000 * 60 * 60 * 12)

    const approvalLogs = await prisma.userActivityLog.findMany({
      where: {
        action: { in: Array.from(TRACKED_ACTIONS) },
        createdAt: { gte: since, lte: visibleCutoff },
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
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 80),
    })

    const approvalItems = approvalLogs.reduce<LiveActivityItem[]>((accumulator, log) => {
      const detail = log.detail ?? null
      const isWithdrawal = WITHDRAWAL_ACTIONS.has(log.action)
      const isPayment = PAYMENT_APPROVAL_ACTIONS.has(log.action)

      if (!isWithdrawal && !isPayment) {
        return accumulator
      }

      if (isWithdrawal && !/(processed|paid|approved)/i.test(detail ?? '')) {
        return accumulator
      }

      accumulator.push({
        id: `approval-${log.id}`,
        name: formatMemberName(log.user?.fullName ?? null, log.user?.email ?? null, log.userId),
        country: 'Global',
        action: isWithdrawal ? 'withdrawal completed for' : 'payment approved for',
        value: isWithdrawal ? extractWithdrawalValue(detail) : extractValue(detail, log.action),
        tone: isWithdrawal ? ('withdrawal' as const) : ('deposit' as const),
        createdAt: log.createdAt.toISOString(),
        source: 'approved' as const,
      })

      return accumulator
    }, [])

    const generatedItems = buildSyntheticWindow(limit * 3, Date.now()).map(item => ({
      ...item,
      createdAt: new Date().toISOString(),
      source: 'generated' as const,
    }))

    const items: LiveActivityItem[] = []
    let approvalIndex = 0
    let generatedIndex = 0

    // Interleave approved payment events into the generated stream.
    while (items.length < limit && (approvalIndex < approvalItems.length || generatedIndex < generatedItems.length)) {
      if (approvalIndex < approvalItems.length) {
        items.push(approvalItems[approvalIndex])
        approvalIndex += 1
        if (items.length >= limit) break
      }

      let burst = 0
      while (generatedIndex < generatedItems.length && burst < 4 && items.length < limit) {
        items.push(generatedItems[generatedIndex])
        generatedIndex += 1
        burst += 1
      }
    }

    return NextResponse.json(
      { items },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    )
  } catch (error) {
    console.error('Live activity feed error:', error)
    return NextResponse.json({ items: [] }, { status: 200 })
  }
}
