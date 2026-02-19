import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import {
  formatAccountBalanceSource,
  parseAccountBalanceEntryDetail,
  type AccountBalanceDirection,
} from '@/lib/account-balance'
import AccountBalanceOperationApproval, {
  type AccountBalanceOperationRow,
} from '@/components/admin/AccountBalanceOperationApproval'
import AccountBalanceManualAdjustments from '@/components/admin/AccountBalanceManualAdjustments'
import AccountBalanceLedgerPanel from '@/components/admin/AccountBalanceLedgerPanel'
import AccountActivityLogManager from '@/components/admin/AccountActivityLogManager'
import AccountBalanceFreezeControls from '@/components/admin/AccountBalanceFreezeControls'
import {
  REAL_ESTATE_BUY_IN_TICKET_PREFIX,
  REAL_ESTATE_WITHDRAWAL_TICKET_PREFIX,
} from '@/lib/real-estate-dashboard'

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
  totalProfitUsd: number
  topReturnLabel: string | null
  topReturnUsd: number
  topMiningPlanLabel: string | null
  topMiningPlanUsd: number
  topTradingPlanLabel: string | null
  topTradingPlanUsd: number
  topPropertyLabel: string | null
  topPropertyUsd: number
  latestAt: string | null
  history: UserBalanceHistoryRow[]
}

type AccountActivityLogRow = {
  id: number
  userId: number
  userName: string
  userEmail: string
  action: string
  detail: string | null
  createdAt: string
  isBalanceEntry: boolean
  hasFinancialImpact: boolean
  balanceEntryStatus: 'pending' | 'settled' | 'rejected' | null
  balanceEntrySource: string | null
}

const asNumber = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const asString = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null

const asCurrencyNumber = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0
}

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

const getTopLabelAndTotal = (items: Map<string, number>) => {
  let label: string | null = null
  let amount = 0
  let total = 0

  for (const [entryLabel, entryAmount] of items.entries()) {
    total += entryAmount
    if (entryAmount > amount) {
      amount = entryAmount
      label = entryLabel
    }
  }

  return {
    label,
    amount: Number(amount.toFixed(2)),
    total: Number(total.toFixed(2)),
  }
}

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
    ? await prisma.$queryRaw<Array<{ id: number; durationHours: number; planName: string | null }>>(
        Prisma.sql`
          SELECT
            tup.id,
            tup.duration_hours AS durationHours,
            tp.name AS planName
          FROM trading_user_plans tup
          LEFT JOIN trading_plans tp ON tp.id = tup.plan_id
          WHERE tup.id IN (${Prisma.join(tradingPlanIds)})
        `
      )
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
        ? `${plan.plan.name} - ${plan.selectedDurationDays} days`
        : 'Mining plan payment from account balance'
    } else if (row.source === 'trading_plan_purchase') {
      const tradingUserPlanId = asNumber(row.metadata?.tradingUserPlanId)
      const plan = tradingUserPlanId ? tradingPlanMap.get(tradingUserPlanId) : null
      subtitle = plan
        ? `${plan.planName ?? 'Trading plan'} - ${plan.durationHours} hours`
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

  const accountActivityRows: AccountActivityLogRow[] = (
    await prisma.userActivityLog.findMany({
      where: {
        action: {
          startsWith: 'Account',
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 260,
      select: {
        id: true,
        userId: true,
        action: true,
        detail: true,
        createdAt: true,
      },
    })
  ).map(log => {
    const user = userMap.get(log.userId)
    const parsedBalanceEntry =
      log.action === 'AccountBalanceEntry' ? parseAccountBalanceEntryDetail(log.detail) : null
    return {
      id: log.id,
      userId: log.userId,
      userName: user?.fullName || user?.email || `User #${log.userId}`,
      userEmail: user?.email || '',
      action: log.action,
      detail: log.detail,
      createdAt: log.createdAt.toISOString(),
      isBalanceEntry: Boolean(parsedBalanceEntry),
      hasFinancialImpact: parsedBalanceEntry?.status === 'settled',
      balanceEntryStatus: parsedBalanceEntry?.status ?? null,
      balanceEntrySource: parsedBalanceEntry?.source ?? null,
    }
  })

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

  const userBalanceMap = new Map<number, UserBalanceSummary>(
    users.map(user => [
      user.id,
      {
        userId: user.id,
        userName: user.fullName || user.email || `User #${user.id}`,
        userEmail: user.email || '',
        balanceUsd: 0,
        availableUsd: 0,
        pendingCreditsUsd: 0,
        pendingDebitsUsd: 0,
        totalDepositsUsd: 0,
        totalWithdrawalsUsd: 0,
        totalInvestedUsd: 0,
        totalCreditsUsd: 0,
        totalDebitsUsd: 0,
        totalProfitUsd: 0,
        topReturnLabel: null,
        topReturnUsd: 0,
        topMiningPlanLabel: null,
        topMiningPlanUsd: 0,
        topTradingPlanLabel: null,
        topTradingPlanUsd: 0,
        topPropertyLabel: null,
        topPropertyUsd: 0,
        latestAt: null,
        history: [],
      } satisfies UserBalanceSummary,
    ])
  )

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
        totalProfitUsd: 0,
        topReturnLabel: null,
        topReturnUsd: 0,
        topMiningPlanLabel: null,
        topMiningPlanUsd: 0,
        topTradingPlanLabel: null,
        topTradingPlanUsd: 0,
        topPropertyLabel: null,
        topPropertyUsd: 0,
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

    if (entry.status === 'settled' && entry.source === 'funding_deposit') {
      current.totalDepositsUsd += entry.direction === 'credit' ? entry.amountUsd : -entry.amountUsd
    }

    if (entry.status === 'settled' && WITHDRAWAL_SOURCES.has(entry.source)) {
      current.totalWithdrawalsUsd += entry.direction === 'debit' ? entry.amountUsd : -entry.amountUsd
    }

    if (entry.status === 'settled' && INVESTMENT_SOURCES.has(entry.source)) {
      current.totalInvestedUsd += entry.direction === 'debit' ? entry.amountUsd : -entry.amountUsd
    }

    userBalanceMap.set(entry.userId, current)
  }

  const userIds = users.map(user => user.id)
  const miningEarnings = userIds.length
    ? await prisma.earnings.findMany({
        where: { userId: { in: userIds } },
        select: {
          userId: true,
          totalEarnedUsd: true,
          userPlan: {
            select: {
              plan: {
                select: { name: true },
              },
            },
          },
        },
      })
    : []

  const tradingEarnings = userIds.length
    ? await prisma.$queryRaw<Array<{ userId: number; totalEarnedUsd: Prisma.Decimal; planName: string | null }>>(
        Prisma.sql`
          SELECT
            te.user_id AS userId,
            te.total_earned_usd AS totalEarnedUsd,
            tp.name AS planName
          FROM trading_earnings te
          LEFT JOIN trading_user_plans tup ON tup.id = te.trading_user_plan_id
          LEFT JOIN trading_plans tp ON tp.id = tup.plan_id
          WHERE te.user_id IN (${Prisma.join(userIds)})
        `
      )
    : []

  const miningByUser = new Map<number, Map<string, number>>()
  const tradingByUser = new Map<number, Map<string, number>>()
  const propertyByUser = new Map<number, Map<string, number>>()

  for (const row of miningEarnings) {
    const label = row.userPlan.plan.name || 'Mining plan'
    const amount = asCurrencyNumber(row.totalEarnedUsd)
    if (amount <= 0) continue

    const bucket = miningByUser.get(row.userId) ?? new Map<string, number>()
    bucket.set(label, Number(((bucket.get(label) ?? 0) + amount).toFixed(2)))
    miningByUser.set(row.userId, bucket)
  }

  for (const row of tradingEarnings) {
    const label = row.planName || 'Trading plan'
    const amount = asCurrencyNumber(row.totalEarnedUsd)
    if (amount <= 0) continue

    const bucket = tradingByUser.get(row.userId) ?? new Map<string, number>()
    bucket.set(label, Number(((bucket.get(label) ?? 0) + amount).toFixed(2)))
    tradingByUser.set(row.userId, bucket)
  }

  const realEstateCreditRows = latestLedgerEntries.filter(
    entry =>
      entry.status === 'settled' &&
      entry.direction === 'credit' &&
      entry.source === 'real_estate_withdrawal'
  )

  const realEstateTicketIds = [
    ...new Set(
      realEstateCreditRows
        .map(entry => asNumber(entry.referenceId.replace('real-estate-withdrawal:', '')))
        .filter((value): value is number => value !== null)
    ),
  ]

  const realEstateTickets = realEstateTicketIds.length
    ? await prisma.supportTicket.findMany({
        where: { id: { in: realEstateTicketIds } },
        select: { id: true, subject: true },
      })
    : []
  const realEstateTicketMap = new Map(realEstateTickets.map(ticket => [ticket.id, ticket.subject]))

  for (const entry of realEstateCreditRows) {
    const ticketId = asNumber(entry.referenceId.replace('real-estate-withdrawal:', ''))
    const subject = ticketId ? realEstateTicketMap.get(ticketId) : null
    const label =
      subject?.replace(REAL_ESTATE_WITHDRAWAL_TICKET_PREFIX, '').trim() || 'Real estate withdrawal'
    const bucket = propertyByUser.get(entry.userId) ?? new Map<string, number>()
    bucket.set(label, Number(((bucket.get(label) ?? 0) + entry.amountUsd).toFixed(2)))
    propertyByUser.set(entry.userId, bucket)
  }

  const userBalanceSummaries = [...userBalanceMap.values()]
    .map(summary => {
      const miningTop = getTopLabelAndTotal(miningByUser.get(summary.userId) ?? new Map())
      const tradingTop = getTopLabelAndTotal(tradingByUser.get(summary.userId) ?? new Map())
      const propertyTop = getTopLabelAndTotal(propertyByUser.get(summary.userId) ?? new Map())
      const totalProfitUsd = Number((miningTop.total + tradingTop.total + propertyTop.total).toFixed(2))

      const topCandidates = [
        { label: miningTop.label, amount: miningTop.amount },
        { label: tradingTop.label, amount: tradingTop.amount },
        { label: propertyTop.label, amount: propertyTop.amount },
      ].filter(item => item.label && item.amount > 0) as Array<{ label: string; amount: number }>

      const topReturn =
        topCandidates.sort((a, b) => b.amount - a.amount)[0] ?? null

      const balanceUsd = Math.max(0, summary.totalCreditsUsd - summary.totalDebitsUsd)
      const availableUsd = Math.max(0, balanceUsd - summary.pendingDebitsUsd)
      return {
        ...summary,
        balanceUsd: Number(balanceUsd.toFixed(2)),
        availableUsd: Number(availableUsd.toFixed(2)),
        pendingCreditsUsd: Number(summary.pendingCreditsUsd.toFixed(2)),
        pendingDebitsUsd: Number(summary.pendingDebitsUsd.toFixed(2)),
        totalDepositsUsd: Number(Math.max(0, summary.totalDepositsUsd).toFixed(2)),
        totalWithdrawalsUsd: Number(Math.max(0, summary.totalWithdrawalsUsd).toFixed(2)),
        totalInvestedUsd: Number(Math.max(0, summary.totalInvestedUsd).toFixed(2)),
        totalCreditsUsd: Number(summary.totalCreditsUsd.toFixed(2)),
        totalDebitsUsd: Number(summary.totalDebitsUsd.toFixed(2)),
        totalProfitUsd,
        topReturnLabel: topReturn?.label ?? null,
        topReturnUsd: Number((topReturn?.amount ?? 0).toFixed(2)),
        topMiningPlanLabel: miningTop.label,
        topMiningPlanUsd: Number(miningTop.amount.toFixed(2)),
        topTradingPlanLabel: tradingTop.label,
        topTradingPlanUsd: Number(tradingTop.amount.toFixed(2)),
        topPropertyLabel: propertyTop.label,
        topPropertyUsd: Number(propertyTop.amount.toFixed(2)),
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

        <AccountBalanceLedgerPanel summaries={userBalanceSummaries} />

        <div className="pt-2 border-t border-white/10 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Ledger Controls</h3>
            <p className="text-sm text-white/65 mt-1">
              Manual adjustments and pending operation approvals for the selected user balances.
            </p>
          </div>

          <div id="manual-adjustments">
            <AccountBalanceManualAdjustments users={manualUsers} adjustments={manualAdjustments} />
          </div>

          <AccountBalanceFreezeControls users={manualUsers} />

          <AccountActivityLogManager logs={accountActivityRows} />

          {operations.length === 0 ? (
            <div
              className="p-8 rounded-2xl text-center"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.10), rgba(255, 255, 255, 0.02))',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
              }}
            >
              <div className="text-lg text-white/75">No pending account-balance operations.</div>
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
      </div>
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
