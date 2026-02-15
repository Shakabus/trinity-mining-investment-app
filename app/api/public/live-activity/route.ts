import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

const APPROVAL_ACTIONS = new Set([
  'PaymentApproved',
  'TradingPaymentApproved',
  'RealEstateBuyInApproved',
])

const DEFAULT_LIMIT = 40
const MAX_LIMIT = 120
const VISIBILITY_DELAY_MS = 7000

type LiveActivityItem = {
  id: string
  name: string
  country: string
  action: string
  value: string
  tone: 'deposit'
  createdAt: string
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const requestedLimit = Number(searchParams.get('limit') || DEFAULT_LIMIT)
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(MAX_LIMIT, Math.floor(requestedLimit)))
      : DEFAULT_LIMIT

    const visibleCutoff = new Date(Date.now() - VISIBILITY_DELAY_MS)
    const since = new Date(Date.now() - 1000 * 60 * 60 * 12)

    const logs = await prisma.userActivityLog.findMany({
      where: {
        action: { in: Array.from(APPROVAL_ACTIONS) },
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
      take: limit,
    })

    const items: LiveActivityItem[] = logs.map(log => ({
      id: `approval-${log.id}`,
      name: formatMemberName(log.user?.fullName ?? null, log.user?.email ?? null, log.userId),
      country: 'Global',
      action: 'payment approved for',
      value: extractValue(log.detail ?? null, log.action),
      tone: 'deposit',
      createdAt: log.createdAt.toISOString(),
    }))

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
