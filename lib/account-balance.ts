import { prisma } from '@/lib/db'
import type { Prisma, PrismaClient } from '@prisma/client'

export const ACCOUNT_BALANCE_ENTRY_ACTION = 'AccountBalanceEntry'

export type AccountBalanceDirection = 'credit' | 'debit'
export type AccountBalanceStatus = 'pending' | 'settled' | 'rejected'

export type AccountBalanceSource =
  | 'funding_deposit'
  | 'mining_plan_purchase'
  | 'trading_plan_purchase'
  | 'mining_withdrawal'
  | 'trading_withdrawal'
  | 'referral_withdrawal'
  | 'external_payment'
  | 'external_trading_payment'
  | 'withdrawal_reversal'

type DbClient = PrismaClient | Prisma.TransactionClient

export type StoredBalanceEntry = {
  version: 1
  direction: AccountBalanceDirection
  status: AccountBalanceStatus
  amountUsd: number
  source: AccountBalanceSource
  referenceId: string
  note?: string
  metadata?: Record<string, unknown>
}

export type AccountBalanceEntry = StoredBalanceEntry & {
  id: number
  userId: number
  createdAt: Date
}

type CreateEntryInput = {
  userId: number
  direction: AccountBalanceDirection
  status: AccountBalanceStatus
  amountUsd: number
  source: AccountBalanceSource
  referenceId: string
  note?: string
  metadata?: Record<string, unknown>
}

const isDirection = (value: unknown): value is AccountBalanceDirection =>
  value === 'credit' || value === 'debit'

const isStatus = (value: unknown): value is AccountBalanceStatus =>
  value === 'pending' || value === 'settled' || value === 'rejected'

const isSource = (value: unknown): value is AccountBalanceSource =>
  value === 'funding_deposit' ||
  value === 'mining_plan_purchase' ||
  value === 'trading_plan_purchase' ||
  value === 'mining_withdrawal' ||
  value === 'trading_withdrawal' ||
  value === 'referral_withdrawal' ||
  value === 'external_payment' ||
  value === 'external_trading_payment' ||
  value === 'withdrawal_reversal'

export function parseAccountBalanceEntryDetail(detail: string | null): StoredBalanceEntry | null {
  if (!detail) return null

  try {
    const parsed = JSON.parse(detail) as Partial<StoredBalanceEntry>
    if (
      parsed.version !== 1 ||
      !isDirection(parsed.direction) ||
      !isStatus(parsed.status) ||
      typeof parsed.amountUsd !== 'number' ||
      !Number.isFinite(parsed.amountUsd) ||
      parsed.amountUsd <= 0 ||
      !isSource(parsed.source) ||
      typeof parsed.referenceId !== 'string' ||
      parsed.referenceId.trim().length === 0
    ) {
      return null
    }

    return {
      version: 1,
      direction: parsed.direction,
      status: parsed.status,
      amountUsd: Number(parsed.amountUsd.toFixed(2)),
      source: parsed.source,
      referenceId: parsed.referenceId,
      note: typeof parsed.note === 'string' ? parsed.note : undefined,
      metadata:
        parsed.metadata && typeof parsed.metadata === 'object' && !Array.isArray(parsed.metadata)
          ? (parsed.metadata as Record<string, unknown>)
          : undefined,
    }
  } catch {
    return null
  }
}

export async function createAccountBalanceEntry(
  input: CreateEntryInput,
  db: DbClient = prisma
): Promise<AccountBalanceEntry> {
  const payload: StoredBalanceEntry = {
    version: 1,
    direction: input.direction,
    status: input.status,
    amountUsd: Number(input.amountUsd.toFixed(2)),
    source: input.source,
    referenceId: input.referenceId,
    note: input.note,
    metadata: input.metadata,
  }

  const row = await db.userActivityLog.create({
    data: {
      userId: input.userId,
      action: ACCOUNT_BALANCE_ENTRY_ACTION,
      detail: JSON.stringify(payload),
    },
  })

  return {
    ...payload,
    id: row.id,
    userId: row.userId,
    createdAt: row.createdAt,
  }
}

export async function getAccountBalanceEntries(
  userId: number,
  options?: { limit?: number },
  db: DbClient = prisma
): Promise<AccountBalanceEntry[]> {
  const rows = await db.userActivityLog.findMany({
    where: {
      userId,
      action: ACCOUNT_BALANCE_ENTRY_ACTION,
    },
    orderBy: { createdAt: 'desc' },
    take: options?.limit ?? 300,
  })

  return rows
    .map(row => {
      const parsed = parseAccountBalanceEntryDetail(row.detail)
      if (!parsed) return null
      return {
        ...parsed,
        id: row.id,
        userId: row.userId,
        createdAt: row.createdAt,
      }
    })
    .filter((entry): entry is AccountBalanceEntry => Boolean(entry))
}

export async function getAccountBalanceSummary(userId: number, db: DbClient = prisma) {
  const entries = await getAccountBalanceEntries(userId, { limit: 3000 }, db)
  const latestByReference = new Map<string, AccountBalanceEntry>()
  for (const entry of entries) {
    const key = `${entry.source}:${entry.direction}:${entry.referenceId}`
    const existing = latestByReference.get(key)
    if (!existing || existing.createdAt.getTime() < entry.createdAt.getTime()) {
      latestByReference.set(key, entry)
    }
  }

  const latestEntries = [...latestByReference.values()]
  const settledEntries = latestEntries.filter(entry => entry.status === 'settled')

  const totalCreditsUsd = settledEntries
    .filter(entry => entry.direction === 'credit')
    .reduce((sum, entry) => sum + entry.amountUsd, 0)

  const totalDebitsUsd = settledEntries
    .filter(entry => entry.direction === 'debit')
    .reduce((sum, entry) => sum + entry.amountUsd, 0)

  const pendingCreditsUsd = latestEntries
    .filter(entry => entry.status === 'pending' && entry.direction === 'credit')
    .reduce((sum, entry) => sum + entry.amountUsd, 0)

  const pendingDebitsUsd = latestEntries
    .filter(entry => entry.status === 'pending' && entry.direction === 'debit')
    .reduce((sum, entry) => sum + entry.amountUsd, 0)

  const balanceUsd = Number(Math.max(0, totalCreditsUsd - totalDebitsUsd).toFixed(2))
  const availableToSpendUsd = Number(Math.max(0, balanceUsd - pendingDebitsUsd).toFixed(2))

  return {
    totalCreditsUsd: Number(totalCreditsUsd.toFixed(2)),
    totalDebitsUsd: Number(totalDebitsUsd.toFixed(2)),
    pendingCreditsUsd: Number(pendingCreditsUsd.toFixed(2)),
    pendingDebitsUsd: Number(pendingDebitsUsd.toFixed(2)),
    balanceUsd,
    availableToSpendUsd,
  }
}

export async function hasSettledEntryForReference(
  userId: number,
  referenceId: string,
  direction?: AccountBalanceDirection,
  db: DbClient = prisma
) {
  const entries = await getAccountBalanceEntries(userId, { limit: 3000 }, db)
  const matching = entries
    .filter(
      entry =>
        entry.referenceId === referenceId &&
        (direction ? entry.direction === direction : true)
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  return matching.length > 0 && matching[0].status === 'settled'
}

export function formatAccountBalanceSource(source: AccountBalanceSource) {
  switch (source) {
    case 'funding_deposit':
      return 'Account funding'
    case 'mining_plan_purchase':
      return 'Mining plan purchase'
    case 'trading_plan_purchase':
      return 'Trading plan purchase'
    case 'mining_withdrawal':
      return 'Mining withdrawal'
    case 'trading_withdrawal':
      return 'Trading withdrawal'
    case 'referral_withdrawal':
      return 'Referral withdrawal'
    case 'external_payment':
      return 'Payment proof approved (mining)'
    case 'external_trading_payment':
      return 'Payment proof approved (trading)'
    case 'withdrawal_reversal':
      return 'Withdrawal reversal'
    default:
      return 'Balance event'
  }
}
