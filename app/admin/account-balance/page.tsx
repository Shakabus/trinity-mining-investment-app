import { prisma } from '@/lib/db'
import {
  parseAccountBalanceEntryDetail,
  type AccountBalanceDirection,
} from '@/lib/account-balance'
import AccountBalanceOperationApproval, {
  type AccountBalanceOperationRow,
} from '@/components/admin/AccountBalanceOperationApproval'
import { REAL_ESTATE_BUY_IN_TICKET_PREFIX } from '@/lib/real-estate-dashboard'

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

const asNumber = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const asString = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null

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

  const userIds = [...new Set(pendingRows.map(entry => entry.userId))]
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, fullName: true, email: true },
      })
    : []
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

    let subtitle = 'Pending account-balance operation.'
    if (row.source === 'funding_deposit') {
      const txid = asString(row.metadata?.txid) ?? 'N/A'
      subtitle = `Funding request TXID: ${txid}`
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
