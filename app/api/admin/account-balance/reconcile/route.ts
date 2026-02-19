import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import {
  ACCOUNT_BALANCE_ENTRY_ACTION,
  createAccountBalanceEntry,
  parseAccountBalanceEntryDetail,
  type AccountBalanceDirection,
  type AccountBalanceSource,
} from '@/lib/account-balance'
import { convertUsdToCoin, getTrackedCryptoPricesUsd, isTrackedAssetCoin } from '@/lib/crypto-prices'
import {
  resolvePendingReconcileDecision,
  type ReconcileUpstreamState,
} from '@/lib/account-balance-reconciliation'
import {
  isInputValidationError,
  readBooleanField,
  readJsonObject,
  readNumberField,
} from '@/lib/requestValidation'

const RECONCILE_POST_FIELDS = ['apply', 'maxAgeMinutes', 'limit'] as const
const RECONCILE_SOURCES = new Set<AccountBalanceSource>([
  'funding_deposit',
  'mining_plan_purchase',
  'trading_plan_purchase',
  'real_estate_buy_in',
  'real_estate_withdrawal',
  'account_balance_withdrawal',
])

type PendingCandidate = {
  userId: number
  createdAt: Date
  source: AccountBalanceSource
  direction: AccountBalanceDirection
  referenceId: string
  amountUsd: number
  metadata?: Record<string, unknown>
}

type ReconcileRow = {
  source: AccountBalanceSource
  referenceId: string
  userId: number
  createdAt: string
  amountUsd: number
  upstreamState: ReconcileUpstreamState
  action: 'settle' | 'reject' | 'skip'
  reason: string
  applied: boolean
}

async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) return null

  const adminUser = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: { id: true, role: true },
  })
  if (!adminUser || adminUser.role !== 'admin') return null
  return adminUser
}

function parseTicketId(candidate: PendingCandidate) {
  const explicit = Number(candidate.metadata?.ticketId)
  if (Number.isFinite(explicit) && explicit > 0) return explicit

  if (candidate.source === 'real_estate_buy_in') {
    const fromRef = Number(candidate.referenceId.replace('real-estate-buy-in:', ''))
    return Number.isFinite(fromRef) && fromRef > 0 ? fromRef : null
  }
  if (candidate.source === 'real_estate_withdrawal') {
    const fromRef = Number(candidate.referenceId.replace('real-estate-withdrawal:', ''))
    return Number.isFinite(fromRef) && fromRef > 0 ? fromRef : null
  }
  return null
}

async function resolveUpstreamState(candidate: PendingCandidate): Promise<ReconcileUpstreamState> {
  if (candidate.source === 'mining_plan_purchase') {
    const planId = Number(candidate.metadata?.userPlanId)
    if (!Number.isFinite(planId) || planId <= 0) return 'missing'

    const plan = await prisma.userPlan.findUnique({
      where: { id: planId },
      select: { status: true, paymentStatus: true },
    })
    if (!plan) return 'missing'
    if (plan.paymentStatus === 'confirmed' || plan.status === 'active' || plan.status === 'completed') {
      return 'confirmed'
    }
    if (plan.paymentStatus === 'pending' && ['selected', 'awaiting_payment'].includes(plan.status)) {
      return 'pending'
    }
    return 'rejected'
  }

  if (candidate.source === 'trading_plan_purchase') {
    const planId = Number(candidate.metadata?.tradingUserPlanId)
    if (!Number.isFinite(planId) || planId <= 0) return 'missing'

    const planRows = await prisma.$queryRaw<
      Array<{
        status: string
        paymentStatus: string
      }>
    >(
      Prisma.sql`
        SELECT
          status,
          payment_status AS paymentStatus
        FROM trading_user_plans
        WHERE id = ${planId}
        LIMIT 1
      `
    )
    const plan = planRows[0]
    if (!plan) return 'missing'
    if (plan.paymentStatus === 'confirmed' || plan.status === 'active' || plan.status === 'completed') {
      return 'confirmed'
    }
    if (plan.paymentStatus === 'pending' && ['selected', 'awaiting_payment'].includes(plan.status)) {
      return 'pending'
    }
    return 'rejected'
  }

  if (candidate.source === 'real_estate_buy_in' || candidate.source === 'real_estate_withdrawal') {
    const ticketId = parseTicketId(candidate)
    if (!ticketId) return 'missing'
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { status: true },
    })
    if (!ticket) return 'missing'
    if (ticket.status === 'closed') return 'closed'
    if (ticket.status === 'rejected') return 'rejected'
    if (ticket.status === 'waiting') return 'waiting'
    if (ticket.status === 'open') return 'open'
    return 'unknown'
  }

  if (candidate.source === 'funding_deposit') {
    return 'stale_pending'
  }

  return 'pending'
}

async function getPendingCandidates(maxAgeMinutes: number, limit: number) {
  const logs = await prisma.userActivityLog.findMany({
    where: { action: ACCOUNT_BALANCE_ENTRY_ACTION },
    orderBy: { createdAt: 'desc' },
    take: 10000,
  })

  const latestByKey = new Map<string, PendingCandidate>()

  for (const log of logs) {
    const parsed = parseAccountBalanceEntryDetail(log.detail)
    if (!parsed) continue
    if (parsed.status !== 'pending') continue
    if (!RECONCILE_SOURCES.has(parsed.source)) continue

    const key = `${parsed.source}:${parsed.direction}:${parsed.referenceId}`
    if (latestByKey.has(key)) continue

    latestByKey.set(key, {
      userId: log.userId,
      createdAt: log.createdAt,
      source: parsed.source,
      direction: parsed.direction,
      referenceId: parsed.referenceId,
      amountUsd: parsed.amountUsd,
      metadata: parsed.metadata,
    })
  }

  const cutoff = Date.now() - maxAgeMinutes * 60 * 1000
  return [...latestByKey.values()]
    .filter(entry => entry.createdAt.getTime() <= cutoff)
    .slice(0, limit)
}

async function runReconciliation(options: { apply: boolean; maxAgeMinutes: number; limit: number; adminId: number }) {
  const candidates = await getPendingCandidates(options.maxAgeMinutes, options.limit)
  const rows: ReconcileRow[] = []
  const prices = options.apply ? await getTrackedCryptoPricesUsd() : null

  for (const candidate of candidates) {
    const upstreamState = await resolveUpstreamState(candidate)
    const decision = resolvePendingReconcileDecision(candidate.source, upstreamState)

    let applied = false
    if (options.apply && decision.action !== 'skip') {
      const metadataCoin = typeof candidate.metadata?.coinType === 'string'
        ? candidate.metadata.coinType.toUpperCase()
        : ''
      const coinType = isTrackedAssetCoin(metadataCoin) ? metadataCoin : undefined
      const amountCrypto =
        typeof candidate.metadata?.amountCrypto === 'number' && Number.isFinite(candidate.metadata.amountCrypto)
          ? candidate.metadata.amountCrypto
          : coinType && prices
          ? convertUsdToCoin(candidate.amountUsd, coinType, prices)
          : undefined

      await createAccountBalanceEntry({
        userId: candidate.userId,
        direction: candidate.direction,
        status: decision.action === 'settle' ? 'settled' : 'rejected',
        amountUsd: candidate.amountUsd,
        source: candidate.source,
        referenceId: candidate.referenceId,
        note: `Reconciled automatically: ${decision.reason}`,
        metadata: {
          ...(candidate.metadata ?? {}),
          coinType,
          amountCrypto,
          reconciledByAdminId: options.adminId,
          reconciledAt: new Date().toISOString(),
          reconciliationReason: decision.reason,
        },
      })
      applied = true
    }

    rows.push({
      source: candidate.source,
      referenceId: candidate.referenceId,
      userId: candidate.userId,
      createdAt: candidate.createdAt.toISOString(),
      amountUsd: candidate.amountUsd,
      upstreamState,
      action: decision.action,
      reason: decision.reason,
      applied,
    })
  }

  return rows
}

export async function GET(req: Request) {
  try {
    const adminUser = await requireAdmin()
    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = new URL(req.url)
    const maxAgeMinutes = Math.max(10, Math.min(10080, Number(url.searchParams.get('maxAgeMinutes') || 720)))
    const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit') || 200)))
    const rows = await runReconciliation({
      apply: false,
      maxAgeMinutes,
      limit,
      adminId: adminUser.id,
    })

    return NextResponse.json({
      preview: true,
      maxAgeMinutes,
      limit,
      total: rows.length,
      actions: {
        settle: rows.filter(row => row.action === 'settle').length,
        reject: rows.filter(row => row.action === 'reject').length,
        skip: rows.filter(row => row.action === 'skip').length,
      },
      rows,
    })
  } catch (error) {
    console.error('Account balance reconciliation preview error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const adminUser = await requireAdmin()
    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await readJsonObject(req, { allowedKeys: RECONCILE_POST_FIELDS })
    const apply = readBooleanField(body, 'apply') ?? false
    const maxAgeMinutes = readNumberField(body, 'maxAgeMinutes', {
      integer: true,
      min: 10,
      max: 10080,
    }) ?? 720
    const limit = readNumberField(body, 'limit', {
      integer: true,
      min: 1,
      max: 500,
    }) ?? 200

    const rows = await runReconciliation({
      apply,
      maxAgeMinutes,
      limit,
      adminId: adminUser.id,
    })

    return NextResponse.json({
      preview: !apply,
      applied: apply,
      maxAgeMinutes,
      limit,
      total: rows.length,
      actions: {
        settle: rows.filter(row => row.action === 'settle').length,
        reject: rows.filter(row => row.action === 'reject').length,
        skip: rows.filter(row => row.action === 'skip').length,
      },
      rows,
    })
  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Account balance reconciliation run error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
