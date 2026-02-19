import { prisma } from '@/lib/db'
import type { Prisma, PrismaClient } from '@prisma/client'
import {
  convertCoinToUsd,
  convertUsdToCoin,
  isTrackedAssetCoin,
  TRACKED_ASSET_COINS,
  type CryptoPriceMap,
  type TrackedAssetCoin,
} from '@/lib/crypto-prices'

export const ACCOUNT_BALANCE_ENTRY_ACTION = 'AccountBalanceEntry'

export type AccountBalanceDirection = 'credit' | 'debit'
export type AccountBalanceStatus = 'pending' | 'settled' | 'rejected'

export type AccountBalanceSource =
  | 'funding_deposit'
  | 'mining_plan_purchase'
  | 'trading_plan_purchase'
  | 'real_estate_buy_in'
  | 'real_estate_withdrawal'
  | 'wallet_conversion'
  | 'account_balance_withdrawal'
  | 'mining_withdrawal'
  | 'trading_withdrawal'
  | 'referral_withdrawal'
  | 'external_payment'
  | 'external_trading_payment'
  | 'admin_manual_adjustment'
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

export type AccountBalanceCoinSummary = {
  coinType: TrackedAssetCoin
  totalInCrypto: number
  totalOutCrypto: number
  netCrypto: number
  totalInUsd: number
  totalOutUsd: number
  netUsd: number
}

export type AccountBalanceCoinAvailability = {
  coinType: TrackedAssetCoin
  settledNetCrypto: number
  reservedPendingDebitCrypto: number
  availableCrypto: number
  settledNetUsd: number
  reservedPendingDebitUsd: number
  availableUsd: number
}

type CoinBreakdown = {
  coinType: TrackedAssetCoin
  amountCrypto: number
  amountUsd: number
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

const PURCHASE_DEBIT_SOURCES: AccountBalanceSource[] = [
  'mining_plan_purchase',
  'trading_plan_purchase',
  'real_estate_buy_in',
]

const PRINCIPAL_CREDIT_SOURCES: AccountBalanceSource[] = [
  'funding_deposit',
  'admin_manual_adjustment',
  'external_payment',
  'external_trading_payment',
]

const PRINCIPAL_DEBIT_SOURCES: AccountBalanceSource[] = [
  ...PURCHASE_DEBIT_SOURCES,
  'admin_manual_adjustment',
]

const EARNING_CREDIT_SOURCES: AccountBalanceSource[] = [
  'mining_withdrawal',
  'trading_withdrawal',
  'referral_withdrawal',
  'real_estate_withdrawal',
]

const WITHDRAWABLE_DEBIT_SOURCES: AccountBalanceSource[] = ['account_balance_withdrawal']

const isDirection = (value: unknown): value is AccountBalanceDirection =>
  value === 'credit' || value === 'debit'

const isStatus = (value: unknown): value is AccountBalanceStatus =>
  value === 'pending' || value === 'settled' || value === 'rejected'

const isSource = (value: unknown): value is AccountBalanceSource =>
  value === 'funding_deposit' ||
  value === 'mining_plan_purchase' ||
  value === 'trading_plan_purchase' ||
  value === 'real_estate_buy_in' ||
  value === 'real_estate_withdrawal' ||
  value === 'wallet_conversion' ||
  value === 'account_balance_withdrawal' ||
  value === 'mining_withdrawal' ||
  value === 'trading_withdrawal' ||
  value === 'referral_withdrawal' ||
  value === 'external_payment' ||
  value === 'external_trading_payment' ||
  value === 'admin_manual_adjustment' ||
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

export function getLatestAccountBalanceEntries(entries: AccountBalanceEntry[]) {
  return [...entries]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .reduce<Map<string, AccountBalanceEntry>>((map, entry) => {
      const key = `${entry.source}:${entry.direction}:${entry.referenceId}`
      if (!map.has(key)) {
        map.set(key, entry)
      }
      return map
    }, new Map())
}

function fallbackCoinBySource(source: AccountBalanceSource): TrackedAssetCoin | null {
  switch (source) {
    case 'external_trading_payment':
    case 'trading_plan_purchase':
    case 'trading_withdrawal':
    case 'account_balance_withdrawal':
      return 'USDT'
    case 'real_estate_buy_in':
    case 'real_estate_withdrawal':
    case 'wallet_conversion':
      return 'USDT'
    case 'admin_manual_adjustment':
      return 'USDT'
    case 'external_payment':
    case 'mining_plan_purchase':
    case 'mining_withdrawal':
    case 'referral_withdrawal':
      return 'BTC'
    default:
      return null
  }
}

function getEntryCoinType(entry: AccountBalanceEntry): TrackedAssetCoin | null {
  const metadataCoin = typeof entry.metadata?.coinType === 'string' ? entry.metadata.coinType.toUpperCase() : null
  if (metadataCoin && isTrackedAssetCoin(metadataCoin)) {
    return metadataCoin
  }
  return fallbackCoinBySource(entry.source)
}

function getEntryCryptoAmount(
  entry: AccountBalanceEntry,
  coinType: TrackedAssetCoin,
  prices: CryptoPriceMap
) {
  const metadataAmount = Number(entry.metadata?.amountCrypto)
  const metadataCoin =
    typeof entry.metadata?.coinType === 'string' ? entry.metadata.coinType.toUpperCase() : null
  // Only trust stored crypto amount if it is explicitly tagged with the same tracked coin.
  if (
    Number.isFinite(metadataAmount) &&
    metadataAmount > 0 &&
    metadataCoin &&
    isTrackedAssetCoin(metadataCoin) &&
    metadataCoin === coinType
  ) {
    return Number(metadataAmount.toFixed(8))
  }

  return convertUsdToCoin(entry.amountUsd, coinType, prices)
}

function getEntryCoinBreakdown(
  entry: AccountBalanceEntry,
  prices: CryptoPriceMap
): CoinBreakdown[] {
  const rawContributions = entry.metadata?.walletContributions

  if (Array.isArray(rawContributions) && rawContributions.length > 0) {
    const aggregated = new Map<TrackedAssetCoin, CoinBreakdown>()

    for (const contribution of rawContributions) {
      if (!contribution || typeof contribution !== 'object') continue

      const coinRaw = (contribution as Record<string, unknown>).coinType
      const cryptoRaw = Number((contribution as Record<string, unknown>).amountCrypto)
      const usdRaw = Number((contribution as Record<string, unknown>).amountUsd)
      const coinType =
        typeof coinRaw === 'string' ? (coinRaw.toUpperCase() as TrackedAssetCoin) : null

      if (!coinType || !isTrackedAssetCoin(coinType)) continue
      if (!Number.isFinite(cryptoRaw) || cryptoRaw <= 0) continue

      const amountCrypto = Number(cryptoRaw.toFixed(8))
      const amountUsd = Number(
        (Number.isFinite(usdRaw) && usdRaw > 0
          ? usdRaw
          : convertCoinToUsd(amountCrypto, coinType, prices)
        ).toFixed(2)
      )

      const current = aggregated.get(coinType)
      if (current) {
        current.amountCrypto = Number((current.amountCrypto + amountCrypto).toFixed(8))
        current.amountUsd = Number((current.amountUsd + amountUsd).toFixed(2))
      } else {
        aggregated.set(coinType, { coinType, amountCrypto, amountUsd })
      }
    }

    if (aggregated.size > 0) {
      return [...aggregated.values()]
    }
  }

  const fallbackCoinType = getEntryCoinType(entry)
  if (!fallbackCoinType) return []

  const fallbackAmountCrypto = getEntryCryptoAmount(entry, fallbackCoinType, prices)
  return [
    {
      coinType: fallbackCoinType,
      amountCrypto: fallbackAmountCrypto,
      amountUsd: Number(entry.amountUsd.toFixed(2)),
    },
  ]
}

export function summarizeAccountBalanceAssets(
  entries: AccountBalanceEntry[],
  prices: CryptoPriceMap
): {
  byCoin: Record<TrackedAssetCoin, AccountBalanceCoinSummary>
  combinedAssetUsd: number
} {
  const latestEntries = [...getLatestAccountBalanceEntries(entries).values()]
  const settledEntries = latestEntries.filter(entry => entry.status === 'settled')

  const byCoin = TRACKED_ASSET_COINS.reduce<Record<TrackedAssetCoin, AccountBalanceCoinSummary>>(
    (map, coinType) => {
      map[coinType] = {
        coinType,
        totalInCrypto: 0,
        totalOutCrypto: 0,
        netCrypto: 0,
        totalInUsd: 0,
        totalOutUsd: 0,
        netUsd: 0,
      }
      return map
    },
    {} as Record<TrackedAssetCoin, AccountBalanceCoinSummary>
  )

  for (const entry of settledEntries) {
    const breakdown = getEntryCoinBreakdown(entry, prices)
    for (const coinEntry of breakdown) {
      const bucket = byCoin[coinEntry.coinType]
      if (entry.direction === 'credit') {
        bucket.totalInCrypto = Number((bucket.totalInCrypto + coinEntry.amountCrypto).toFixed(8))
        bucket.totalInUsd = Number((bucket.totalInUsd + coinEntry.amountUsd).toFixed(2))
      } else {
        bucket.totalOutCrypto = Number((bucket.totalOutCrypto + coinEntry.amountCrypto).toFixed(8))
        bucket.totalOutUsd = Number((bucket.totalOutUsd + coinEntry.amountUsd).toFixed(2))
      }
    }
  }

  let combinedAssetUsd = 0
  for (const coinType of TRACKED_ASSET_COINS) {
    const bucket = byCoin[coinType]
    bucket.netCrypto = Number((bucket.totalInCrypto - bucket.totalOutCrypto).toFixed(8))
    bucket.netUsd = convertCoinToUsd(bucket.netCrypto, coinType, prices)
    combinedAssetUsd += bucket.netUsd
  }

  return {
    byCoin,
    combinedAssetUsd: Number(combinedAssetUsd.toFixed(2)),
  }
}

export function summarizeAccountBalanceCoinAvailability(
  entries: AccountBalanceEntry[],
  prices: CryptoPriceMap
): {
  byCoin: Record<TrackedAssetCoin, AccountBalanceCoinAvailability>
} {
  const latestEntries = [...getLatestAccountBalanceEntries(entries).values()]

  const byCoin = TRACKED_ASSET_COINS.reduce<Record<TrackedAssetCoin, AccountBalanceCoinAvailability>>(
    (map, coinType) => {
      map[coinType] = {
        coinType,
        settledNetCrypto: 0,
        reservedPendingDebitCrypto: 0,
        availableCrypto: 0,
        settledNetUsd: 0,
        reservedPendingDebitUsd: 0,
        availableUsd: 0,
      }
      return map
    },
    {} as Record<TrackedAssetCoin, AccountBalanceCoinAvailability>
  )

  for (const entry of latestEntries) {
    const breakdown = getEntryCoinBreakdown(entry, prices)
    if (!breakdown.length) continue

    if (entry.status === 'settled') {
      for (const coinEntry of breakdown) {
        const bucket = byCoin[coinEntry.coinType]
        if (entry.direction === 'credit') {
          bucket.settledNetCrypto = Number((bucket.settledNetCrypto + coinEntry.amountCrypto).toFixed(8))
          bucket.settledNetUsd = Number((bucket.settledNetUsd + coinEntry.amountUsd).toFixed(2))
        } else {
          bucket.settledNetCrypto = Number((bucket.settledNetCrypto - coinEntry.amountCrypto).toFixed(8))
          bucket.settledNetUsd = Number((bucket.settledNetUsd - coinEntry.amountUsd).toFixed(2))
        }
      }
      continue
    }

    if (entry.status === 'pending' && entry.direction === 'debit') {
      for (const coinEntry of breakdown) {
        const bucket = byCoin[coinEntry.coinType]
        bucket.reservedPendingDebitCrypto = Number(
          (bucket.reservedPendingDebitCrypto + coinEntry.amountCrypto).toFixed(8)
        )
        bucket.reservedPendingDebitUsd = Number(
          (bucket.reservedPendingDebitUsd + coinEntry.amountUsd).toFixed(2)
        )
      }
    }
  }

  for (const coinType of TRACKED_ASSET_COINS) {
    const bucket = byCoin[coinType]
    bucket.availableCrypto = Number(
      Math.max(0, bucket.settledNetCrypto - bucket.reservedPendingDebitCrypto).toFixed(8)
    )
    bucket.availableUsd = convertCoinToUsd(bucket.availableCrypto, coinType, prices)
  }

  return { byCoin }
}

export async function getAccountBalanceAssetSummary(
  userId: number,
  prices: CryptoPriceMap,
  db: DbClient = prisma
) {
  const entries = await getAccountBalanceEntries(userId, { limit: 3000 }, db)
  return summarizeAccountBalanceAssets(entries, prices)
}

export async function getAccountBalanceCoinAvailability(
  userId: number,
  prices: CryptoPriceMap,
  db: DbClient = prisma
) {
  const entries = await getAccountBalanceEntries(userId, { limit: 3000 }, db)
  return summarizeAccountBalanceCoinAvailability(entries, prices)
}

export async function lockUserBalanceForUpdate(userId: number, db: Prisma.TransactionClient) {
  try {
    await db.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`
  } catch (error) {
    // Some managed MySQL environments can block row-level locks.
    // Fallback keeps balance flows functional while transaction checks still apply.
    console.warn('Balance row lock skipped:', error)
  }
}

export async function getAccountBalanceSummary(userId: number, db: DbClient = prisma) {
  const entries = await getAccountBalanceEntries(userId, { limit: 3000 }, db)
  const latestEntries = [...getLatestAccountBalanceEntries(entries).values()]
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

  const principalCreditsUsd = settledEntries
    .filter(
      entry =>
        entry.direction === 'credit' &&
        (PRINCIPAL_CREDIT_SOURCES as AccountBalanceSource[]).includes(entry.source)
    )
    .reduce((sum, entry) => sum + entry.amountUsd, 0)

  const principalDebitsUsd = settledEntries
    .filter(
      entry =>
        entry.direction === 'debit' &&
        (PRINCIPAL_DEBIT_SOURCES as AccountBalanceSource[]).includes(entry.source)
    )
    .reduce((sum, entry) => sum + entry.amountUsd, 0)

  const pendingPurchaseDebitsUsd = latestEntries
    .filter(
      entry =>
        entry.status === 'pending' &&
        entry.direction === 'debit' &&
        (PURCHASE_DEBIT_SOURCES as AccountBalanceSource[]).includes(entry.source)
    )
    .reduce((sum, entry) => sum + entry.amountUsd, 0)

  const earnedCreditsUsd = settledEntries
    .filter(
      entry =>
        entry.direction === 'credit' &&
        ((EARNING_CREDIT_SOURCES as AccountBalanceSource[]).includes(entry.source) ||
          entry.source === 'withdrawal_reversal')
    )
    .reduce((sum, entry) => sum + entry.amountUsd, 0)

  const earnedDebitsUsd = settledEntries
    .filter(
      entry =>
        entry.direction === 'debit' &&
        ((WITHDRAWABLE_DEBIT_SOURCES as AccountBalanceSource[]).includes(entry.source) ||
          entry.source === 'withdrawal_reversal')
    )
    .reduce((sum, entry) => sum + entry.amountUsd, 0)

  const pendingWithdrawalsUsd = latestEntries
    .filter(
      entry =>
        entry.status === 'pending' &&
        entry.direction === 'debit' &&
        (WITHDRAWABLE_DEBIT_SOURCES as AccountBalanceSource[]).includes(entry.source)
    )
    .reduce((sum, entry) => sum + entry.amountUsd, 0)

  const principalBalanceUsd = Number(Math.max(0, principalCreditsUsd - principalDebitsUsd).toFixed(2))
  const availableToSpendUsd = Number(Math.max(0, principalBalanceUsd - pendingPurchaseDebitsUsd).toFixed(2))

  const earningsBalanceUsd = Number(Math.max(0, earnedCreditsUsd - earnedDebitsUsd).toFixed(2))
  const withdrawableEarningsUsd = Number(
    Math.max(0, earningsBalanceUsd - pendingWithdrawalsUsd).toFixed(2)
  )

  const balanceUsd = Number(Math.max(0, principalBalanceUsd + earningsBalanceUsd).toFixed(2))

  return {
    totalCreditsUsd: Number(totalCreditsUsd.toFixed(2)),
    totalDebitsUsd: Number(totalDebitsUsd.toFixed(2)),
    pendingCreditsUsd: Number(pendingCreditsUsd.toFixed(2)),
    pendingDebitsUsd: Number(pendingDebitsUsd.toFixed(2)),
    balanceUsd,
    availableToSpendUsd,
    principalCreditsUsd: Number(principalCreditsUsd.toFixed(2)),
    principalDebitsUsd: Number(principalDebitsUsd.toFixed(2)),
    principalBalanceUsd,
    pendingPurchaseDebitsUsd: Number(pendingPurchaseDebitsUsd.toFixed(2)),
    earnedCreditsUsd: Number(earnedCreditsUsd.toFixed(2)),
    earnedDebitsUsd: Number(earnedDebitsUsd.toFixed(2)),
    earningsBalanceUsd,
    pendingWithdrawalsUsd: Number(pendingWithdrawalsUsd.toFixed(2)),
    withdrawableEarningsUsd,
    totalDepositedUsd: Number(principalCreditsUsd.toFixed(2)),
    totalInvestedUsd: Number(
      settledEntries
        .filter(
          entry =>
            entry.direction === 'debit' &&
            (PURCHASE_DEBIT_SOURCES as AccountBalanceSource[]).includes(entry.source)
        )
        .reduce((sum, entry) => sum + entry.amountUsd, 0)
        .toFixed(2)
    ),
    totalWithdrawnUsd: Number(
      settledEntries
        .filter(
          entry =>
            entry.direction === 'debit' &&
            (WITHDRAWABLE_DEBIT_SOURCES as AccountBalanceSource[]).includes(entry.source)
        )
        .reduce((sum, entry) => sum + entry.amountUsd, 0)
        .toFixed(2)
    ),
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
    case 'real_estate_buy_in':
      return 'Real estate buy-in'
    case 'real_estate_withdrawal':
      return 'Real estate withdrawal'
    case 'wallet_conversion':
      return 'Wallet conversion'
    case 'account_balance_withdrawal':
      return 'Account withdrawal'
    case 'mining_withdrawal':
      return 'Mining withdrawal'
    case 'trading_withdrawal':
      return 'Trading withdrawal'
    case 'referral_withdrawal':
      return 'Referral withdrawal'
    case 'external_payment':
      return 'Mining payment settled'
    case 'external_trading_payment':
      return 'Trading payment settled'
    case 'admin_manual_adjustment':
      return 'Admin manual adjustment'
    case 'withdrawal_reversal':
      return 'Withdrawal reversal'
    default:
      return 'Balance event'
  }
}
