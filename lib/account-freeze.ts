import { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/db'
import {
  convertCoinToUsd,
  convertUsdToCoin,
  type CryptoPriceMap,
  type TrackedAssetCoin,
} from '@/lib/crypto-prices'

type DbClient = PrismaClient | Prisma.TransactionClient

type CoinFreezeSettings = {
  incomingFreezeUsd: number
  outgoingFreezeUsd: number
}

export type AccountFreezeAssetLocks = {
  spendableFundsLocked: boolean
  withdrawableFundsLocked: boolean
  earningsLocked: boolean
  walletFundsLocked: boolean
}

export type AccountFreezeSettings = {
  userId: number
  freezeIncomingAll: boolean
  freezeOutgoingAll: boolean
  accountIncomingFreezeUsd: number
  accountOutgoingFreezeUsd: number
  note: string | null
  assetLocks: AccountFreezeAssetLocks
  updatedByAdminId: number | null
  updatedAt: string | null
  coins: Record<TrackedAssetCoin, CoinFreezeSettings>
}

export type AccountFreezeVisualState = {
  incomingLocked: boolean
  outgoingLocked: boolean
  spendableLocked: boolean
  withdrawableLocked: boolean
  earningsLocked: boolean
  walletsLocked: boolean
}

export type AccountFreezeQueryResult = {
  settings: AccountFreezeSettings
  tableMissing: boolean
}

type AccountFreezeUpsertInput = {
  userId: number
  freezeIncomingAll: boolean
  freezeOutgoingAll: boolean
  accountIncomingFreezeUsd: number
  accountOutgoingFreezeUsd: number
  note: string | null
  assetLocks: AccountFreezeAssetLocks
  updatedByAdminId: number | null
  coins: Record<TrackedAssetCoin, CoinFreezeSettings>
}

const COINS: TrackedAssetCoin[] = ['BTC', 'ETH', 'USDT', 'SOL']
const OUTGOING_EPSILON_USD = 0.009

const defaultAssetLocks = (): AccountFreezeAssetLocks => ({
  spendableFundsLocked: false,
  withdrawableFundsLocked: false,
  earningsLocked: false,
  walletFundsLocked: false,
})

function readBoolean(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true' || normalized === '1') return true
    if (normalized === 'false' || normalized === '0') return false
  }
  return fallback
}

function parseFreezeNote(rawValue: unknown): {
  note: string | null
  assetLocks: AccountFreezeAssetLocks
} {
  const fallback = {
    note: typeof rawValue === 'string' && rawValue.trim().length > 0 ? rawValue.trim() : null,
    assetLocks: defaultAssetLocks(),
  }

  if (typeof rawValue !== 'string') return fallback
  const trimmed = rawValue.trim()
  if (!trimmed.startsWith('{')) return fallback

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object') return fallback
    const parsedLocks =
      parsed.assetLocks && typeof parsed.assetLocks === 'object'
        ? (parsed.assetLocks as Record<string, unknown>)
        : {}
    const noteValue =
      typeof parsed.note === 'string' && parsed.note.trim().length > 0 ? parsed.note.trim() : null
    return {
      note: noteValue,
      assetLocks: {
        spendableFundsLocked: readBoolean(parsedLocks.spendableFundsLocked),
        withdrawableFundsLocked: readBoolean(parsedLocks.withdrawableFundsLocked),
        earningsLocked: readBoolean(parsedLocks.earningsLocked),
        walletFundsLocked: readBoolean(parsedLocks.walletFundsLocked),
      },
    }
  } catch {
    return fallback
  }
}

function hasAnyAssetLock(lock: AccountFreezeAssetLocks) {
  return (
    lock.spendableFundsLocked ||
    lock.withdrawableFundsLocked ||
    lock.earningsLocked ||
    lock.walletFundsLocked
  )
}

function serializeFreezeNote(note: string | null, assetLocks: AccountFreezeAssetLocks) {
  if (!hasAnyAssetLock(assetLocks)) {
    return note && note.trim().length > 0 ? note.trim() : null
  }
  return JSON.stringify({
    version: 1,
    note: note && note.trim().length > 0 ? note.trim() : null,
    assetLocks,
  })
}

function toUsd(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Number(Math.max(0, parsed).toFixed(2))
}

function toBool(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true'
  return false
}

function defaultCoinFreezes(): Record<TrackedAssetCoin, CoinFreezeSettings> {
  return {
    BTC: { incomingFreezeUsd: 0, outgoingFreezeUsd: 0 },
    ETH: { incomingFreezeUsd: 0, outgoingFreezeUsd: 0 },
    USDT: { incomingFreezeUsd: 0, outgoingFreezeUsd: 0 },
    SOL: { incomingFreezeUsd: 0, outgoingFreezeUsd: 0 },
  }
}

export function buildDefaultAccountFreezeSettings(userId: number): AccountFreezeSettings {
  return {
    userId,
    freezeIncomingAll: false,
    freezeOutgoingAll: false,
    accountIncomingFreezeUsd: 0,
    accountOutgoingFreezeUsd: 0,
    note: null,
    assetLocks: defaultAssetLocks(),
    updatedByAdminId: null,
    updatedAt: null,
    coins: defaultCoinFreezes(),
  }
}

function isMissingFreezeTableError(error: unknown) {
  if (typeof error !== 'object' || !error) return false
  const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : ''
  const meta =
    'meta' in error && typeof (error as { meta?: unknown }).meta === 'object'
      ? ((error as { meta?: Record<string, unknown> }).meta ?? {})
      : {}
  const metaCode = String(meta.code ?? '')
  const metaMessage = String(meta.message ?? '')
  const message = error instanceof Error ? error.message : String(error)
  return (
    code === 'P2021' ||
    (code === 'P2010' && metaCode === '1146') ||
    (message.includes('account_balance_freeze_controls') &&
      (message.includes('does not exist') || message.includes("doesn't exist"))) ||
    (metaMessage.includes('account_balance_freeze_controls') &&
      (metaMessage.includes('does not exist') || metaMessage.includes("doesn't exist")))
  )
}

function mapSettingsRow(row: Record<string, unknown>, userIdFallback: number): AccountFreezeSettings {
  const parsedNote = parseFreezeNote(row.note)
  return {
    userId: Number(row.userId ?? userIdFallback),
    freezeIncomingAll: toBool(row.freezeIncomingAll),
    freezeOutgoingAll: toBool(row.freezeOutgoingAll),
    accountIncomingFreezeUsd: toUsd(row.accountIncomingFreezeUsd),
    accountOutgoingFreezeUsd: toUsd(row.accountOutgoingFreezeUsd),
    note: parsedNote.note,
    assetLocks: parsedNote.assetLocks,
    updatedByAdminId: Number.isFinite(Number(row.updatedByAdminId)) ? Number(row.updatedByAdminId) : null,
    updatedAt:
      row.updatedAt instanceof Date
        ? row.updatedAt.toISOString()
        : typeof row.updatedAt === 'string'
          ? row.updatedAt
          : null,
    coins: {
      BTC: {
        incomingFreezeUsd: toUsd(row.btcIncomingFreezeUsd),
        outgoingFreezeUsd: toUsd(row.btcOutgoingFreezeUsd),
      },
      ETH: {
        incomingFreezeUsd: toUsd(row.ethIncomingFreezeUsd),
        outgoingFreezeUsd: toUsd(row.ethOutgoingFreezeUsd),
      },
      USDT: {
        incomingFreezeUsd: toUsd(row.usdtIncomingFreezeUsd),
        outgoingFreezeUsd: toUsd(row.usdtOutgoingFreezeUsd),
      },
      SOL: {
        incomingFreezeUsd: toUsd(row.solIncomingFreezeUsd),
        outgoingFreezeUsd: toUsd(row.solOutgoingFreezeUsd),
      },
    },
  }
}

export function logAccountFreezeTableMissing(context: string) {
  console.warn(`[${context}] account_balance_freeze_controls table is missing in the active database`)
}

export async function getAccountFreezeSettings(
  userId: number,
  db: DbClient = prisma
): Promise<AccountFreezeQueryResult> {
  try {
    const rows = await db.$queryRaw<Array<Record<string, unknown>>>(
      Prisma.sql`
        SELECT
          user_id AS userId,
          freeze_incoming_all AS freezeIncomingAll,
          freeze_outgoing_all AS freezeOutgoingAll,
          account_incoming_freeze_usd AS accountIncomingFreezeUsd,
          account_outgoing_freeze_usd AS accountOutgoingFreezeUsd,
          btc_incoming_freeze_usd AS btcIncomingFreezeUsd,
          btc_outgoing_freeze_usd AS btcOutgoingFreezeUsd,
          eth_incoming_freeze_usd AS ethIncomingFreezeUsd,
          eth_outgoing_freeze_usd AS ethOutgoingFreezeUsd,
          usdt_incoming_freeze_usd AS usdtIncomingFreezeUsd,
          usdt_outgoing_freeze_usd AS usdtOutgoingFreezeUsd,
          sol_incoming_freeze_usd AS solIncomingFreezeUsd,
          sol_outgoing_freeze_usd AS solOutgoingFreezeUsd,
          note,
          updated_by_admin_id AS updatedByAdminId,
          updated_at AS updatedAt
        FROM account_balance_freeze_controls
        WHERE user_id = ${userId}
        LIMIT 1
      `
    )

    if (!rows.length) {
      return {
        settings: buildDefaultAccountFreezeSettings(userId),
        tableMissing: false,
      }
    }

    return {
      settings: mapSettingsRow(rows[0], userId),
      tableMissing: false,
    }
  } catch (error) {
    if (isMissingFreezeTableError(error)) {
      return {
        settings: buildDefaultAccountFreezeSettings(userId),
        tableMissing: true,
      }
    }
    throw error
  }
}

export async function getAccountFreezeSettingsForUsers(
  userIds: number[],
  db: DbClient = prisma
): Promise<{ byUserId: Map<number, AccountFreezeSettings>; tableMissing: boolean }> {
  const byUserId = new Map<number, AccountFreezeSettings>()
  for (const userId of userIds) {
    byUserId.set(userId, buildDefaultAccountFreezeSettings(userId))
  }

  if (!userIds.length) {
    return { byUserId, tableMissing: false }
  }

  try {
    const rows = await db.$queryRaw<Array<Record<string, unknown>>>(
      Prisma.sql`
        SELECT
          user_id AS userId,
          freeze_incoming_all AS freezeIncomingAll,
          freeze_outgoing_all AS freezeOutgoingAll,
          account_incoming_freeze_usd AS accountIncomingFreezeUsd,
          account_outgoing_freeze_usd AS accountOutgoingFreezeUsd,
          btc_incoming_freeze_usd AS btcIncomingFreezeUsd,
          btc_outgoing_freeze_usd AS btcOutgoingFreezeUsd,
          eth_incoming_freeze_usd AS ethIncomingFreezeUsd,
          eth_outgoing_freeze_usd AS ethOutgoingFreezeUsd,
          usdt_incoming_freeze_usd AS usdtIncomingFreezeUsd,
          usdt_outgoing_freeze_usd AS usdtOutgoingFreezeUsd,
          sol_incoming_freeze_usd AS solIncomingFreezeUsd,
          sol_outgoing_freeze_usd AS solOutgoingFreezeUsd,
          note,
          updated_by_admin_id AS updatedByAdminId,
          updated_at AS updatedAt
        FROM account_balance_freeze_controls
        WHERE user_id IN (${Prisma.join(userIds)})
      `
    )

    for (const row of rows) {
      const userId = Number(row.userId)
      if (!Number.isFinite(userId)) continue
      byUserId.set(userId, mapSettingsRow(row, userId))
    }

    return { byUserId, tableMissing: false }
  } catch (error) {
    if (isMissingFreezeTableError(error)) {
      return { byUserId, tableMissing: true }
    }
    throw error
  }
}

export async function upsertAccountFreezeSettings(
  input: AccountFreezeUpsertInput,
  db: DbClient = prisma
): Promise<AccountFreezeQueryResult> {
  const userId = input.userId
  const note = input.note && input.note.trim().length > 0 ? input.note.trim() : null
  const assetLocks: AccountFreezeAssetLocks = {
    spendableFundsLocked: Boolean(input.assetLocks.spendableFundsLocked),
    withdrawableFundsLocked: Boolean(input.assetLocks.withdrawableFundsLocked),
    earningsLocked: Boolean(input.assetLocks.earningsLocked),
    walletFundsLocked: Boolean(input.assetLocks.walletFundsLocked),
  }
  const serializedNote = serializeFreezeNote(note, assetLocks)
  const updatedByAdminId = Number.isFinite(Number(input.updatedByAdminId))
    ? Number(input.updatedByAdminId)
    : null
  const accountIncomingFreezeUsd = toUsd(input.accountIncomingFreezeUsd)
  const accountOutgoingFreezeUsd = toUsd(input.accountOutgoingFreezeUsd)

  const coins: Record<TrackedAssetCoin, CoinFreezeSettings> = {
    BTC: {
      incomingFreezeUsd: toUsd(input.coins.BTC.incomingFreezeUsd),
      outgoingFreezeUsd: toUsd(input.coins.BTC.outgoingFreezeUsd),
    },
    ETH: {
      incomingFreezeUsd: toUsd(input.coins.ETH.incomingFreezeUsd),
      outgoingFreezeUsd: toUsd(input.coins.ETH.outgoingFreezeUsd),
    },
    USDT: {
      incomingFreezeUsd: toUsd(input.coins.USDT.incomingFreezeUsd),
      outgoingFreezeUsd: toUsd(input.coins.USDT.outgoingFreezeUsd),
    },
    SOL: {
      incomingFreezeUsd: toUsd(input.coins.SOL.incomingFreezeUsd),
      outgoingFreezeUsd: toUsd(input.coins.SOL.outgoingFreezeUsd),
    },
  }

  try {
    await db.$executeRaw(
      Prisma.sql`
        INSERT INTO account_balance_freeze_controls (
          user_id,
          freeze_incoming_all,
          freeze_outgoing_all,
          account_incoming_freeze_usd,
          account_outgoing_freeze_usd,
          btc_incoming_freeze_usd,
          btc_outgoing_freeze_usd,
          eth_incoming_freeze_usd,
          eth_outgoing_freeze_usd,
          usdt_incoming_freeze_usd,
          usdt_outgoing_freeze_usd,
          sol_incoming_freeze_usd,
          sol_outgoing_freeze_usd,
          note,
          updated_by_admin_id,
          created_at,
          updated_at
        ) VALUES (
          ${userId},
          ${input.freezeIncomingAll},
          ${input.freezeOutgoingAll},
          ${accountIncomingFreezeUsd},
          ${accountOutgoingFreezeUsd},
          ${coins.BTC.incomingFreezeUsd},
          ${coins.BTC.outgoingFreezeUsd},
          ${coins.ETH.incomingFreezeUsd},
          ${coins.ETH.outgoingFreezeUsd},
          ${coins.USDT.incomingFreezeUsd},
          ${coins.USDT.outgoingFreezeUsd},
          ${coins.SOL.incomingFreezeUsd},
          ${coins.SOL.outgoingFreezeUsd},
          ${serializedNote},
          ${updatedByAdminId},
          NOW(3),
          NOW(3)
        )
        ON DUPLICATE KEY UPDATE
          freeze_incoming_all = VALUES(freeze_incoming_all),
          freeze_outgoing_all = VALUES(freeze_outgoing_all),
          account_incoming_freeze_usd = VALUES(account_incoming_freeze_usd),
          account_outgoing_freeze_usd = VALUES(account_outgoing_freeze_usd),
          btc_incoming_freeze_usd = VALUES(btc_incoming_freeze_usd),
          btc_outgoing_freeze_usd = VALUES(btc_outgoing_freeze_usd),
          eth_incoming_freeze_usd = VALUES(eth_incoming_freeze_usd),
          eth_outgoing_freeze_usd = VALUES(eth_outgoing_freeze_usd),
          usdt_incoming_freeze_usd = VALUES(usdt_incoming_freeze_usd),
          usdt_outgoing_freeze_usd = VALUES(usdt_outgoing_freeze_usd),
          sol_incoming_freeze_usd = VALUES(sol_incoming_freeze_usd),
          sol_outgoing_freeze_usd = VALUES(sol_outgoing_freeze_usd),
          note = VALUES(note),
          updated_by_admin_id = VALUES(updated_by_admin_id),
          updated_at = NOW(3)
      `
    )

    return getAccountFreezeSettings(userId, db)
  } catch (error) {
    if (isMissingFreezeTableError(error)) {
      return {
        settings: buildDefaultAccountFreezeSettings(userId),
        tableMissing: true,
      }
    }
    throw error
  }
}

export class AccountFreezeError extends Error {
  status: number

  constructor(message: string, status = 423) {
    super(message)
    this.status = status
  }
}

export function getCoinIncomingFreezeUsd(settings: AccountFreezeSettings, coinType: TrackedAssetCoin) {
  return settings.coins[coinType]?.incomingFreezeUsd ?? 0
}

export function getCoinOutgoingFreezeUsd(settings: AccountFreezeSettings, coinType: TrackedAssetCoin) {
  return settings.coins[coinType]?.outgoingFreezeUsd ?? 0
}

export function assertIncomingAllowed(params: {
  settings: AccountFreezeSettings
  coinType: TrackedAssetCoin
  context: string
}) {
  const { settings, coinType, context } = params

  if (settings.freezeIncomingAll) {
    throw new AccountFreezeError(`Incoming funds are frozen for this account. (${context})`)
  }

  if (settings.accountIncomingFreezeUsd > 0) {
    throw new AccountFreezeError(
      `Incoming funds are frozen on this account ($${settings.accountIncomingFreezeUsd.toFixed(2)} locked).`
    )
  }

  const coinFrozenUsd = getCoinIncomingFreezeUsd(settings, coinType)
  if (coinFrozenUsd > 0) {
    throw new AccountFreezeError(
      `Incoming ${coinType} funds are frozen on this account ($${coinFrozenUsd.toFixed(2)} locked).`
    )
  }
}

export type AccountFreezeMetric = 'spendable' | 'withdrawable' | 'earnings' | 'wallets'

const METRIC_LOCK_LABELS: Record<AccountFreezeMetric, string> = {
  spendable: 'Spendable funds',
  withdrawable: 'Withdrawable funds',
  earnings: 'Earnings credits',
  wallets: 'Wallet funds',
}

const isMetricLocked = (settings: AccountFreezeSettings, metric: AccountFreezeMetric) => {
  if (metric === 'spendable') return settings.assetLocks.spendableFundsLocked
  if (metric === 'withdrawable') return settings.assetLocks.withdrawableFundsLocked
  if (metric === 'earnings') return settings.assetLocks.earningsLocked
  return settings.assetLocks.walletFundsLocked
}

export function assertMetricAllowed(params: {
  settings: AccountFreezeSettings
  metric: AccountFreezeMetric
  context: string
}) {
  const { settings, metric, context } = params
  if (!isMetricLocked(settings, metric)) return
  throw new AccountFreezeError(`${METRIC_LOCK_LABELS[metric]} are locked for this account (${context}).`)
}

export function summarizeActiveMetricLocks(settings: AccountFreezeSettings) {
  const active: string[] = []
  if (settings.assetLocks.spendableFundsLocked) active.push('Spendable funds')
  if (settings.assetLocks.withdrawableFundsLocked) active.push('Withdrawable funds')
  if (settings.assetLocks.earningsLocked) active.push('Earnings credits')
  if (settings.assetLocks.walletFundsLocked) active.push('Wallet funds')
  return active
}

export function buildAccountFreezeVisualState(
  settings: AccountFreezeSettings
): AccountFreezeVisualState {
  const incomingLocked =
    settings.freezeIncomingAll ||
    settings.accountIncomingFreezeUsd > 0 ||
    COINS.some(coin => getCoinIncomingFreezeUsd(settings, coin) > 0)

  const outgoingLocked =
    settings.freezeOutgoingAll ||
    settings.accountOutgoingFreezeUsd > 0 ||
    COINS.some(coin => getCoinOutgoingFreezeUsd(settings, coin) > 0)

  return {
    incomingLocked,
    outgoingLocked,
    spendableLocked: settings.assetLocks.spendableFundsLocked || outgoingLocked,
    withdrawableLocked: settings.assetLocks.withdrawableFundsLocked || outgoingLocked,
    earningsLocked: settings.assetLocks.earningsLocked || incomingLocked,
    walletsLocked: settings.assetLocks.walletFundsLocked || incomingLocked || outgoingLocked,
  }
}

export function getAccountOutgoingAvailableUsd(availableUsd: number, settings: AccountFreezeSettings) {
  return Number(Math.max(0, availableUsd - settings.accountOutgoingFreezeUsd).toFixed(2))
}

export function assertOutgoingAllowed(params: {
  settings: AccountFreezeSettings
  amountUsd: number
  availableUsd: number
  context: string
}) {
  const { settings, amountUsd, availableUsd, context } = params
  if (settings.freezeOutgoingAll) {
    throw new AccountFreezeError(`Outgoing transfers are frozen for this account. (${context})`)
  }

  const availableAfterReserve = getAccountOutgoingAvailableUsd(availableUsd, settings)
  if (amountUsd > availableAfterReserve + OUTGOING_EPSILON_USD) {
    throw new AccountFreezeError(
      `Outgoing limit reached. $${settings.accountOutgoingFreezeUsd.toFixed(2)} is reserved on this account. Available for ${context}: $${availableAfterReserve.toFixed(2)}.`
    )
  }
}

export function applyOutgoingCoinFreezesToAvailability<
  T extends {
    byCoin: Record<TrackedAssetCoin, { availableUsd: number; availableCrypto: number }>
  },
>(availability: T, settings: AccountFreezeSettings, prices: CryptoPriceMap): T {
  const nextByCoin = { ...availability.byCoin }

  for (const coinType of COINS) {
    const current = nextByCoin[coinType]
    if (!current) continue

    const frozenUsd = getCoinOutgoingFreezeUsd(settings, coinType)
    if (frozenUsd <= 0) continue

    const frozenCrypto = convertUsdToCoin(frozenUsd, coinType, prices)
    const nextAvailableCrypto = Number(Math.max(0, current.availableCrypto - frozenCrypto).toFixed(8))
    const nextAvailableUsd = convertCoinToUsd(nextAvailableCrypto, coinType, prices)

    nextByCoin[coinType] = {
      ...current,
      availableCrypto: nextAvailableCrypto,
      availableUsd: nextAvailableUsd,
    }
  }

  return {
    ...availability,
    byCoin: nextByCoin,
  }
}
