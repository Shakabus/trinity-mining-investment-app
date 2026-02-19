import { prisma } from '@/lib/db'
import {
  formatAccountBalanceSource,
  parseAccountBalanceEntryDetail,
  type AccountBalanceDirection,
} from '@/lib/account-balance'
import AccountBalanceOperationApproval, {
  type AccountBalanceOperationRow,
} from '@/components/admin/AccountBalanceOperationApproval'
import AccountBalanceManualAdjustments from '@/components/admin/AccountBalanceManualAdjustments'
import { REAL_ESTATE_BUY_IN_TICKET_PREFIX } from '@/lib/real-estate-dashboard'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const REVIEWABLE_SOURCES = new Set([
  'funding_deposit',
  'mining_plan_purchase',
  'trading_plan_purchase',
  'real_estate_buy_in',
  'account_balance_withdrawal',
] as const)

type ReviewableSource =
  | 'funding_deposit'
  | 'mining_plan_purchase'
  | 'trading_plan_purchase'
  | 'real_estate_buy_in'
  | 'account_balance_withdrawal'

type ManualAdjustmentRow = {
  entryId: number
  referenceId: string
  userId: number
  userName: string
  userEmail: string
  direction: AccountBalanceDirection
  amountUsd: number
  coinType: string
  amountCrypto: number | null
  paymentMethod: string | null
  note: string | null
  createdAt: string
}

type UserBalanceHistoryRow = {
  id: string
  createdAt: string
  direction: AccountBalanceDirection
  status: 'pending' | 'settled' | 'rejected'
  amountUsd: number
  sourceLabel: string
  note: string | null
  coinType: string | null
}

type UserBalanceSummary = {
  userId: number
  userName: string
  userEmail: string
  balanceUsd: number
  availableUsd: number
  pendingCreditsUsd: number
  pendingDebitsUsd: number
  totalDepositsUsd: number
  totalWithdrawalsUsd: number
  totalInvestedUsd: number
  totalCreditsUsd: number
  totalDebitsUsd: number
  latestAt: string | null
  history: UserBalanceHistoryRow[]
}

const asNumber = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const asString = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null

const WITHDRAWAL_SOURCES = new Set([
  'account_balance_withdrawal',
  'mining_withdrawal',
  'trading_withdrawal',
  'referral_withdrawal',
  'real_estate_withdrawal',
])

const INVESTMENT_SOURCES = new Set([
  'mining_plan_purchase',
  'trading_plan_purchase',
  'real_estate_buy_in',
])

export default async function AdminAccountBalancePage() {
  const logs = await prisma.userActivityLog.findMany({
    where: { action: 'AccountBalanceEntry' },
    orderBy: { createdAt: 'desc' },
    take: 6000,
  })

  const latestByKey = new Map<
    string,
    {
      userId: number
      createdAt: Date
      source: ReviewableSource
      direction: AccountBalanceDirection
      referenceId: string
      status: 'pending' | 'settled' | 'rejected'
      amountUsd: number
      metadata?: Record<string, unknown>
    }
  >()

  for (const log of logs) {
    const parsed = parseAccountBalanceEntryDetail(log.detail)
    if (!parsed || !REVIEWABLE_SOURCES.has(parsed.source as ReviewableSource)) continue

    const key = `${parsed.source}:${parsed.direction}:${parsed.referenceId}`
    if (latestByKey.has(key)) continue

    latestByKey.set(key, {
      userId: log.userId,
      createdAt: log.createdAt,
      source: parsed.source as ReviewableSource,
      direction: parsed.direction,
      referenceId: parsed.referenceId,
      status: parsed.status,
      amountUsd: parsed.amountUsd,
      metadata: parsed.metadata,
    })
  }

  const pendingRows = [...latestByKey.values()]
    .filter(entry => entry.status === 'pending')
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  const users = await prisma.user.findMany({
    select: { id: true, fullName: true, email: true },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  })
  const userMap = new Map(users.map(user => [user.id, user]))

  const miningPlanIds = [
    ...new Set(
      pendingRows
        .map(row => asNumber(row.metadata?.userPlanId))
        .filter((value): value is number => value !== null)
    ),
  ]
  const miningPlans = miningPlanIds.length
    ? await prisma.userPlan.findMany({
        where: { id: { in: miningPlanIds } },
        include: { plan: true },
      })
    : []
  const miningPlanMap = new Map(miningPlans.map(plan => [plan.id, plan]))

  const tradingPlanIds = [
    ...new Set(
      pendingRows
        .map(row => asNumber(row.metadata?.tradingUserPlanId))
        .filter((value): value is number => value !== null)
    ),
  ]
  const tradingPlans = tradingPlanIds.length
    ? await prisma.tradingUserPlan.findMany({
        where: { id: { in: tradingPlanIds } },
        include: { plan: true },
      })
    : []
  const tradingPlanMap = new Map(tradingPlans.map(plan => [plan.id, plan]))

  const ticketIds = [
    ...new Set(
      pendingRows
        .map(row => {
          const explicitId = asNumber(row.metadata?.ticketId)
          if (explicitId !== null) return explicitId
          if (row.source === 'real_estate_buy_in') {
            return asNumber(row.referenceId.replace('real-estate-buy-in:', ''))
          }
          return null
        })
        .filter((value): value is number => value !== null)
    ),
  ]
  const tickets = ticketIds.length
    ? await prisma.supportTicket.findMany({
        where: { id: { in: ticketIds } },
        select: { id: true, subject: true, status: true },
      })
    : []
  const ticketMap = new Map(tickets.map(ticket => [ticket.id, ticket]))

  const operations: AccountBalanceOperationRow[] = pendingRows.map(row => {
    const user = userMap.get(row.userId)
    const coinType = asString(row.metadata?.coinType)?.toUpperCase() ?? null
    const amountCrypto = asNumber(row.metadata?.amountCrypto)
    const proofUrl = asString(row.metadata?.proofUrl)
    const txid = asString(row.metadata?.txid)

    let subtitle = 'Pending account-balance operation.'
    if (row.source === 'funding_deposit') {
      subtitle = `Funding request TXID: ${txid ?? 'N/A'}`
    } else if (row.source === 'mining_plan_purchase') {
      const userPlanId = asNumber(row.metadata?.userPlanId)
      const plan = userPlanId ? miningPlanMap.get(userPlanId) : null
      subtitle = plan
        ? `${plan.plan.name} • ${plan.selectedDurationDays} days`
        : 'Mining plan payment from account balance'
    } else if (row.source === 'trading_plan_purchase') {
      const tradingUserPlanId = asNumber(row.metadata?.tradingUserPlanId)
      const plan = tradingUserPlanId ? tradingPlanMap.get(tradingUserPlanId) : null
      subtitle = plan
        ? `${plan.plan.name} • ${plan.durationHours} hours`
        : 'Trading plan payment from account balance'
    } else if (row.source === 'real_estate_buy_in') {
      const ticketId =
        asNumber(row.metadata?.ticketId) ?? asNumber(row.referenceId.replace('real-estate-buy-in:', ''))
      const ticket = ticketId ? ticketMap.get(ticketId) : null
      subtitle = ticket
        ? ticket.subject.replace(REAL_ESTATE_BUY_IN_TICKET_PREFIX, '').trim()
        : 'Real-estate buy-in payment from account balance'
    } else if (row.source === 'account_balance_withdrawal') {
      const destinationCoin = asString(row.metadata?.coinType)?.toUpperCase() ?? 'N/A'
      const destinationWallet = asString(row.metadata?.walletAddress)
      subtitle = destinationWallet
        ? `Destination ${destinationCoin}: ${destinationWallet}`
        : `Custom payout method request (${destinationCoin})`
    }

    return {
      source: row.source,
      referenceId: row.referenceId,
      userName: user?.fullName || user?.email || 'Unknown',
      userEmail: user?.email || '',
      amountUsd: row.amountUsd,
      createdAt: row.createdAt.toISOString(),
      coinType,
      amountCrypto,
      subtitle,
      txid,
      proofUrl,
    }
  })

  const sourceCounts = operations.reduce<Record<ReviewableSource, number>>(
    (acc, operation) => {
      acc[operation.source] += 1
      return acc
    },
    {
      funding_deposit: 0,
      mining_plan_purchase: 0,
      trading_plan_purchase: 0,
      real_estate_buy_in: 0,
      account_balance_withdrawal: 0,
    }
  )

  const manualAdjustments: ManualAdjustmentRow[] = logs
    .map(log => {
      const parsed = parseAccountBalanceEntryDetail(log.detail)
      if (!parsed || parsed.source !== 'admin_manual_adjustment') return null

      const user = userMap.get(log.userId)
      const coinType = asString(parsed.metadata?.coinType)?.toUpperCase() ?? 'USDT'
      const amountCrypto = asNumber(parsed.metadata?.amountCrypto)
      const paymentMethod = asString(parsed.metadata?.customPaymentMethod)
      const entryNote = asString(parsed.note)

      return {
        entryId: log.id,
        referenceId: parsed.referenceId,
        userId: log.userId,
        userName: user?.fullName || user?.email || 'Unknown',
        userEmail: user?.email || '',
        direction: parsed.direction,
        amountUsd: parsed.amountUsd,
        coinType,
        amountCrypto,
        paymentMethod,
        note: entryNote,
        createdAt: log.createdAt.toISOString(),
      }
    })
    .filter((entry): entry is ManualAdjustmentRow => Boolean(entry))
    .slice(0, 80)

  const manualUsers = users.map(user => ({
    id: user.id,
    name: user.fullName || user.email || `User #${user.id}`,
    email: user.email || '',
  }))

  const latestLedgerByKey = new Map<
    string,
    {
      userId: number
      createdAt: Date
      source: string
      direction: AccountBalanceDirection
      referenceId: string
      status: 'pending' | 'settled' | 'rejected'
      amountUsd: number
      note: string | null
      coinType: string | null
    }
  >()

  for (const log of logs) {
    const parsed = parseAccountBalanceEntryDetail(log.detail)
    if (!parsed) continue

    const key = `${parsed.source}:${parsed.direction}:${parsed.referenceId}`
    if (latestLedgerByKey.has(key)) continue

    latestLedgerByKey.set(key, {
      userId: log.userId,
      createdAt: log.createdAt,
      source: parsed.source,
      direction: parsed.direction,
      referenceId: parsed.referenceId,
      status: parsed.status,
      amountUsd: parsed.amountUsd,
      note: asString(parsed.note),
      coinType: asString(parsed.metadata?.coinType)?.toUpperCase() ?? null,
    })
  }

  const latestLedgerEntries = [...latestLedgerByKey.values()].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  )

  const userBalanceMap = new Map<number, UserBalanceSummary>()

  for (const entry of latestLedgerEntries) {
    const user = userMap.get(entry.userId)
    const current =
      userBalanceMap.get(entry.userId) ??
      ({
        userId: entry.userId,
        userName: user?.fullName || user?.email || `User #${entry.userId}`,
        userEmail: user?.email || '',
        balanceUsd: 0,
        availableUsd: 0,
        pendingCreditsUsd: 0,
        pendingDebitsUsd: 0,
        totalDepositsUsd: 0,
        totalWithdrawalsUsd: 0,
        totalInvestedUsd: 0,
        totalCreditsUsd: 0,
        totalDebitsUsd: 0,
        latestAt: null,
        history: [],
      } satisfies UserBalanceSummary)

    const sourceLabel = formatAccountBalanceSource(entry.source as any)
    if (!current.latestAt) {
      current.latestAt = entry.createdAt.toISOString()
    }

    if (current.history.length < 12) {
      current.history.push({
        id: `${entry.source}:${entry.direction}:${entry.referenceId}`,
        createdAt: entry.createdAt.toISOString(),
        direction: entry.direction,
        status: entry.status,
        amountUsd: entry.amountUsd,
        sourceLabel,
        note: entry.note,
        coinType: entry.coinType,
      })
    }

    if (entry.status === 'settled') {
      if (entry.direction === 'credit') {
        current.totalCreditsUsd += entry.amountUsd
      } else {
        current.totalDebitsUsd += entry.amountUsd
      }
    } else if (entry.status === 'pending') {
      if (entry.direction === 'credit') {
        current.pendingCreditsUsd += entry.amountUsd
      } else {
        current.pendingDebitsUsd += entry.amountUsd
      }
    }

    if (entry.status === 'settled' && entry.direction === 'credit' && entry.source === 'funding_deposit') {
      current.totalDepositsUsd += entry.amountUsd
    }

    if (entry.status === 'settled' && entry.direction === 'debit' && WITHDRAWAL_SOURCES.has(entry.source)) {
      current.totalWithdrawalsUsd += entry.amountUsd
    }

    if (entry.status === 'settled' && entry.direction === 'debit' && INVESTMENT_SOURCES.has(entry.source)) {
      current.totalInvestedUsd += entry.amountUsd
    }

    userBalanceMap.set(entry.userId, current)
  }

  const userBalanceSummaries = [...userBalanceMap.values()]
    .map(summary => {
      const balanceUsd = Math.max(0, summary.totalCreditsUsd - summary.totalDebitsUsd)
      const availableUsd = Math.max(0, balanceUsd - summary.pendingDebitsUsd)
      return {
        ...summary,
        balanceUsd: Number(balanceUsd.toFixed(2)),
        availableUsd: Number(availableUsd.toFixed(2)),
        pendingCreditsUsd: Number(summary.pendingCreditsUsd.toFixed(2)),
        pendingDebitsUsd: Number(summary.pendingDebitsUsd.toFixed(2)),
        totalDepositsUsd: Number(summary.totalDepositsUsd.toFixed(2)),
        totalWithdrawalsUsd: Number(summary.totalWithdrawalsUsd.toFixed(2)),
        totalInvestedUsd: Number(summary.totalInvestedUsd.toFixed(2)),
        totalCreditsUsd: Number(summary.totalCreditsUsd.toFixed(2)),
        totalDebitsUsd: Number(summary.totalDebitsUsd.toFixed(2)),
      }
    })
    .sort((a, b) => b.balanceUsd - a.balanceUsd)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Account Balance Controls</h1>
        <p className="text-white/70">
          Approve or reject account deposits, account withdrawals, account-balance plan payments, and balance-linked buy-ins.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricCard label="Deposits pending" value={sourceCounts.funding_deposit} />
        <MetricCard label="Withdrawals pending" value={sourceCounts.account_balance_withdrawal} />
        <MetricCard label="Mining pending" value={sourceCounts.mining_plan_purchase} />
        <MetricCard label="Trading pending" value={sourceCounts.trading_plan_purchase} />
        <MetricCard label="Real-estate pending" value={sourceCounts.real_estate_buy_in} />
      </div>

      <div id="manual-adjustments">
        <AccountBalanceManualAdjustments users={manualUsers} adjustments={manualAdjustments} />
      </div>

      <div
        className="p-5 rounded-2xl space-y-4"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          border: '1px solid rgba(255, 255, 255, 0.16)',
        }}
      >
        <div>
          <h2 className="text-xl font-semibold text-white">User Account Balance Ledger</h2>
          <p className="text-sm text-white/65 mt-1">
            Full account-balance visibility for deposits, withdrawals, plan debits, and history per user.
          </p>
        </div>

        {userBalanceSummaries.length === 0 ? (
          <div className="text-sm text-white/60">No account-balance entries found.</div>
        ) : (
          <div className="space-y-3">
            {userBalanceSummaries.map(summary => (
              <div
                key={summary.userId}
                className="rounded-xl p-4"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-white font-semibold">{summary.userName}</div>
                    <div className="text-xs text-white/60">{summary.userEmail || `User #${summary.userId}`}</div>
                    <div className="text-[11px] text-white/45 mt-1">
                      Last ledger update:{' '}
                      {summary.latestAt ? new Date(summary.latestAt).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/users/${summary.userId}`}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                      style={{
                        background: 'rgba(59, 130, 246, 0.25)',
                        border: '1px solid rgba(147, 197, 253, 0.45)',
                      }}
                    >
                      Open User
                    </Link>
                    <a
                      href="#manual-adjustments"
                      className="px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                      style={{
                        background: 'rgba(16, 185, 129, 0.2)',
                        border: '1px solid rgba(110, 231, 183, 0.45)',
                      }}
                    >
                      Adjust Balance
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mt-4 text-xs">
                  <MiniStat label="Balance" value={summary.balanceUsd} positive />
                  <MiniStat label="Available" value={summary.availableUsd} positive />
                  <MiniStat label="Pending + " value={summary.pendingCreditsUsd} />
                  <MiniStat label="Pending - " value={summary.pendingDebitsUsd} />
                  <MiniStat label="Deposits" value={summary.totalDepositsUsd} positive />
                  <MiniStat label="Withdrawn" value={summary.totalWithdrawalsUsd} />
                  <MiniStat label="Invested" value={summary.totalInvestedUsd} />
                  <MiniStat label="Net Debits" value={summary.totalDebitsUsd} />
                </div>

                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-white/80 hover:text-white">
                    View recent account-balance history ({summary.history.length})
                  </summary>
                  <div className="mt-3 space-y-2">
                    {summary.history.map(item => (
                      <div
                        key={item.id}
                        className="rounded-lg px-3 py-2 flex flex-wrap items-center justify-between gap-2"
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        <div className="min-w-0">
                          <div className="text-xs text-white/85">
                            {item.sourceLabel}
                            {item.coinType ? ` (${item.coinType})` : ''}
                          </div>
                          <div className="text-[11px] text-white/55">
                            {new Date(item.createdAt).toLocaleString()} - {item.status.toUpperCase()}
                            {item.note ? ` - ${item.note}` : ''}
                          </div>
                        </div>
                        <div
                          className={`text-sm font-semibold ${
                            item.direction === 'credit' ? 'text-emerald-300' : 'text-rose-300'
                          }`}
                        >
                          {item.direction === 'credit' ? '+' : '-'}$
                          {item.amountUsd.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            ))}
          </div>
        )}
      </div>

      {operations.length === 0 ? (
        <div
          className="p-12 rounded-3xl text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="text-2xl text-white/75">No pending account-balance operations.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {operations.map(operation => (
            <AccountBalanceOperationApproval
              key={`${operation.source}:${operation.referenceId}`}
              operation={operation}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="p-4 rounded-2xl"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
        border: '1px solid rgba(255, 255, 255, 0.16)',
      }}
    >
      <div className="text-xs text-white/65 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-semibold text-white mt-2">{value.toLocaleString()}</div>
    </div>
  )
}

function MiniStat({ label, value, positive }: { label: string; value: number; positive?: boolean }) {
  return (
    <div
      className="rounded-lg px-2 py-2"
      style={{
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div className="text-[10px] text-white/60 uppercase tracking-wide">{label}</div>
      <div className={`text-sm font-semibold mt-1 ${positive ? 'text-emerald-300' : 'text-white'}`}>
        ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
    </div>
  )
}
