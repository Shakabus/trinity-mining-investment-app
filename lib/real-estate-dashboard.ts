import { prisma } from '@/lib/db'

export const REAL_ESTATE_BUY_IN_TICKET_PREFIX = 'Real Estate Buy-In Proof -'
export const REAL_ESTATE_WITHDRAWAL_TICKET_PREFIX = 'Real Estate Withdrawal Request -'

export type RealEstatePositionStatus = 'submitted' | 'under_review' | 'approved' | 'rejected'

export type RealEstatePosition = {
  id: number
  property: string
  location: string
  tier: string
  allocationUsd: number
  duration: string
  cycleMonths: number
  coinType: string
  txid: string
  projectedBand: string
  monthlyIncomeUsd: number
  monthlyNetUsd: number
  realizedNetUsd: number
  elapsedMonths: number
  remainingMonths: number
  submittedAt: string
  activatedAt: string | null
  nextPayoutDate: string | null
  status: RealEstatePositionStatus
}

export type RealEstatePayoutEvent = {
  id: string
  property: string
  periodLabel: string
  grossUsd: number
  feesUsd: number
  netUsd: number
  status: 'scheduled' | 'paid'
  payoutDate: string
}

export type RealEstateWithdrawal = {
  id: string
  requestedAt: string
  amountUsd: number
  method: string
  destination: string
  status: 'pending' | 'processing' | 'paid' | 'rejected'
  reference: string
}

export type RealEstateEarningsSummary = {
  totalRealizedUsd: number
  thisMonthRealizedUsd: number
  monthlyRunRateUsd: number
  avgYieldPerMonthPct: number
  nextPayoutNetUsd: number
  nextPayoutDate: string | null
  nextPayoutProperty: string | null
  upcomingPayoutsNetUsd: number
  approvedCount: number
  activeApprovedCount: number
  pendingCount: number
  portfolioAllocationUsd: number
}

type ParsedTicketBody = {
  property: string
  location: string
  tier: string
  minimum: string
  duration: string
  projectedBand: string
  coinType: string
  txid: string
}

const WITHDRAWAL_WINDOW_MONTHS = 6
const PAYOUT_FEE_RATE = 0.06

const parseAmount = (value: string) => {
  const num = Number(value.replace(/[^0-9.]/g, ''))
  return Number.isFinite(num) ? num : 0
}

const parseLabel = (body: string, label: string) => {
  const regex = new RegExp(`^${label}:\\s*(.+)$`, 'im')
  const match = body.match(regex)
  return match?.[1]?.trim() ?? ''
}

const parseTicketBody = (body: string): ParsedTicketBody => ({
  property: parseLabel(body, 'Property'),
  location: parseLabel(body, 'Location'),
  tier: parseLabel(body, 'Tier'),
  minimum: parseLabel(body, 'Minimum'),
  duration: parseLabel(body, 'Duration'),
  projectedBand: parseLabel(body, 'Projected Band'),
  coinType: parseLabel(body, 'Payment Coin'),
  txid: parseLabel(body, 'TXID'),
})

const parseDurationMonths = (value: string) => {
  const match = value.match(/(\d+)\s*month/i)
  if (!match) return 0
  const months = Number(match[1])
  return Number.isFinite(months) ? months : 0
}

const parseProjectedBandPercent = (value: string) => {
  const range = value.match(/(\d+(?:\.\d+)?)\s*%\s*-\s*(\d+(?:\.\d+)?)\s*%/)
  if (range) {
    return {
      low: Number(range[1]),
      high: Number(range[2]),
    }
  }

  const single = value.match(/(\d+(?:\.\d+)?)\s*%/)
  if (single) {
    const pct = Number(single[1])
    return {
      low: pct,
      high: pct,
    }
  }

  return {
    low: 0,
    high: 0,
  }
}

const monthsBetween = (from: Date, to: Date) => {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
  if (to.getDate() < from.getDate()) {
    months -= 1
  }
  return Math.max(months, 0)
}

const addMonths = (date: Date, months: number) => {
  const copy = new Date(date.getTime())
  copy.setMonth(copy.getMonth() + months)
  return copy
}

const mapBuyInTicketStatus = (status: string): RealEstatePositionStatus => {
  if (status === 'closed') return 'approved'
  if (status === 'waiting') return 'under_review'
  if (status === 'rejected') return 'rejected'
  return 'submitted'
}

const mapWithdrawalTicketStatus = (status: string): RealEstateWithdrawal['status'] => {
  if (status === 'closed') return 'paid'
  if (status === 'waiting') return 'processing'
  if (status === 'rejected') return 'rejected'
  return 'pending'
}

const formatPeriodLabel = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) + ' Cycle'

export async function getRealEstateDashboardData(clerkUserId: string): Promise<{
  positions: RealEstatePosition[]
  payouts: RealEstatePayoutEvent[]
  withdrawals: RealEstateWithdrawal[]
  summary: RealEstateEarningsSummary
  availableWithdrawalUsd: number
  canRequestWithdrawal: boolean
  nextWithdrawalEligibleAt: string | null
  canCreateNewBuyIn: boolean
}> {
  const user = await prisma.user.findUnique({
    where: { clerkUserId },
    include: {
      supportTickets: {
        where: {
          OR: [
            { subject: { startsWith: REAL_ESTATE_BUY_IN_TICKET_PREFIX } },
            { subject: { startsWith: REAL_ESTATE_WITHDRAWAL_TICKET_PREFIX } },
          ],
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  })

  if (!user) {
    return {
      positions: [],
      payouts: [],
      withdrawals: [],
      summary: {
        totalRealizedUsd: 0,
        thisMonthRealizedUsd: 0,
        monthlyRunRateUsd: 0,
        avgYieldPerMonthPct: 0,
        nextPayoutNetUsd: 0,
        nextPayoutDate: null,
        nextPayoutProperty: null,
        upcomingPayoutsNetUsd: 0,
        approvedCount: 0,
        activeApprovedCount: 0,
        pendingCount: 0,
        portfolioAllocationUsd: 0,
      },
      availableWithdrawalUsd: 0,
      canRequestWithdrawal: false,
      nextWithdrawalEligibleAt: null,
      canCreateNewBuyIn: true,
    }
  }

  const buyInTickets = user.supportTickets.filter(ticket =>
    ticket.subject.startsWith(REAL_ESTATE_BUY_IN_TICKET_PREFIX),
  )
  const withdrawalTickets = user.supportTickets.filter(ticket =>
    ticket.subject.startsWith(REAL_ESTATE_WITHDRAWAL_TICKET_PREFIX),
  )
  const now = new Date()

  const positions: RealEstatePosition[] = buyInTickets.map(ticket => {
    const userMessage = ticket.messages.find(message => message.senderRole === 'user')
    const parsed = parseTicketBody(userMessage?.body || '')
    const cycleMonths = parseDurationMonths(parsed.duration)
    const projectedBand = parseProjectedBandPercent(parsed.projectedBand)
    const midpointPct = (projectedBand.low + projectedBand.high) / 2
    const allocationUsd = parseAmount(parsed.minimum)
    const totalCycleIncome = allocationUsd * (midpointPct / 100)
    const monthlyIncomeUsd = cycleMonths > 0 ? totalCycleIncome / cycleMonths : 0
    const monthlyNetUsd = monthlyIncomeUsd * (1 - PAYOUT_FEE_RATE)
    const status = mapBuyInTicketStatus(ticket.status)
    const activatedAt = status === 'approved' ? ticket.updatedAt : null
    const earningsStart = activatedAt ?? ticket.createdAt
    const elapsedMonths =
      status === 'approved' && cycleMonths > 0 ? Math.min(monthsBetween(earningsStart, now), cycleMonths) : 0
    const remainingMonths = cycleMonths > 0 ? Math.max(cycleMonths - elapsedMonths, 0) : 0
    const realizedNetUsd = elapsedMonths * monthlyNetUsd
    const nextPayoutDate =
      status === 'approved' && cycleMonths > 0 && elapsedMonths < cycleMonths
        ? addMonths(earningsStart, elapsedMonths + 1).toISOString()
        : null
    const txidCompact = parsed.txid ? `${parsed.txid.slice(0, 10)}...${parsed.txid.slice(-6)}` : '-'

    return {
      id: ticket.id,
      property: parsed.property || 'Property Not Parsed',
      location: parsed.location || 'Location Not Parsed',
      tier: parsed.tier || 'Tier Not Parsed',
      allocationUsd,
      duration: parsed.duration || '-',
      cycleMonths,
      coinType: parsed.coinType || '-',
      txid: txidCompact,
      projectedBand: parsed.projectedBand || '-',
      monthlyIncomeUsd,
      monthlyNetUsd,
      realizedNetUsd,
      elapsedMonths,
      remainingMonths,
      submittedAt: ticket.createdAt.toISOString(),
      activatedAt: activatedAt?.toISOString() ?? null,
      nextPayoutDate,
      status,
    }
  })

  const approvedPositions = positions.filter(position => position.status === 'approved')

  const payouts: RealEstatePayoutEvent[] = []
  for (const position of approvedPositions) {
    if (position.cycleMonths <= 0 || position.monthlyIncomeUsd <= 0) continue

    const startedAt = new Date(position.activatedAt ?? position.submittedAt)
    const elapsedMonths = Math.min(position.elapsedMonths, position.cycleMonths)

    for (let month = 1; month <= elapsedMonths; month += 1) {
      const payoutDate = addMonths(startedAt, month)
      const grossUsd = position.monthlyIncomeUsd
      const feesUsd = grossUsd * PAYOUT_FEE_RATE
      const netUsd = grossUsd - feesUsd

      payouts.push({
        id: `${position.id}-paid-${month}`,
        property: position.property,
        periodLabel: formatPeriodLabel(payoutDate),
        grossUsd,
        feesUsd,
        netUsd,
        status: 'paid',
        payoutDate: payoutDate.toISOString(),
      })
    }

    if (elapsedMonths < position.cycleMonths) {
      const nextMonth = elapsedMonths + 1
      const payoutDate = addMonths(startedAt, nextMonth)
      const grossUsd = position.monthlyIncomeUsd
      const feesUsd = grossUsd * PAYOUT_FEE_RATE
      const netUsd = grossUsd - feesUsd

      payouts.push({
        id: `${position.id}-scheduled-${nextMonth}`,
        property: position.property,
        periodLabel: formatPeriodLabel(payoutDate),
        grossUsd,
        feesUsd,
        netUsd,
        status: 'scheduled',
        payoutDate: payoutDate.toISOString(),
      })
    }
  }

  payouts.sort((a, b) => +new Date(b.payoutDate) - +new Date(a.payoutDate))

  const withdrawals: RealEstateWithdrawal[] = withdrawalTickets.map(ticket => {
    const userMessage = ticket.messages.find(message => message.senderRole === 'user')
    const body = userMessage?.body || ''
    const amountUsd = parseAmount(parseLabel(body, 'Requested Amount USD'))
    const method = parseLabel(body, 'Method') || 'Support Managed'
    const destination = parseLabel(body, 'Destination') || '-'

    return {
      id: String(ticket.id),
      requestedAt: ticket.createdAt.toISOString(),
      amountUsd,
      method,
      destination,
      status: mapWithdrawalTicketStatus(ticket.status),
      reference: `RE-WD-${ticket.id}`,
    }
  })

  withdrawals.sort((a, b) => +new Date(b.requestedAt) - +new Date(a.requestedAt))

  const earliestMaturityDates = approvedPositions.map(position =>
    addMonths(new Date(position.activatedAt ?? position.submittedAt), WITHDRAWAL_WINDOW_MONTHS),
  )
  const firstMaturityDate =
    earliestMaturityDates.length > 0
      ? new Date(Math.min(...earliestMaturityDates.map(date => date.getTime())))
      : null

  const hasMaturedAllocation = earliestMaturityDates.some(date => date <= now)

  const unlockedNetIncome = approvedPositions.reduce((sum, position) => {
    if (position.cycleMonths <= 0 || position.monthlyIncomeUsd <= 0) return sum

    const startedAt = new Date(position.activatedAt ?? position.submittedAt)
    const maturedAt = addMonths(startedAt, WITHDRAWAL_WINDOW_MONTHS)
    if (maturedAt > now) return sum

    const elapsedMonths = Math.min(position.elapsedMonths, position.cycleMonths)
    return sum + elapsedMonths * position.monthlyNetUsd
  }, 0)

  const lockedOrPaidWithdrawals = withdrawals
    .filter(withdrawal => withdrawal.status !== 'rejected')
    .reduce((sum, withdrawal) => sum + withdrawal.amountUsd, 0)

  const availableWithdrawalUsd = Math.max(unlockedNetIncome - lockedOrPaidWithdrawals, 0)

  const lastWithdrawalRequest = withdrawals[0]
  const nextByWindow = lastWithdrawalRequest
    ? addMonths(new Date(lastWithdrawalRequest.requestedAt), WITHDRAWAL_WINDOW_MONTHS)
    : null
  const windowOpen = !nextByWindow || nextByWindow <= now

  const canRequestWithdrawal = hasMaturedAllocation && windowOpen && availableWithdrawalUsd > 0
  const nextWithdrawalEligibleAt = !windowOpen
    ? nextByWindow!.toISOString()
    : !hasMaturedAllocation && firstMaturityDate
    ? firstMaturityDate.toISOString()
    : null

  const hasPendingBuyIn = positions.some(
    position => position.status === 'submitted' || position.status === 'under_review',
  )

  const paidEvents = payouts.filter(item => item.status === 'paid')
  const scheduledEvents = payouts.filter(item => item.status === 'scheduled')
  const nextScheduledEvent = [...scheduledEvents].sort(
    (a, b) => +new Date(a.payoutDate) - +new Date(b.payoutDate),
  )[0]
  const activeApprovedPositions = approvedPositions.filter(position => position.remainingMonths > 0)
  const activeApprovedAllocationUsd = activeApprovedPositions.reduce(
    (sum, position) => sum + position.allocationUsd,
    0,
  )
  const monthlyRunRateUsd = activeApprovedPositions.reduce(
    (sum, position) => sum + position.monthlyNetUsd,
    0,
  )

  const summary: RealEstateEarningsSummary = {
    totalRealizedUsd: paidEvents.reduce((sum, item) => sum + item.netUsd, 0),
    thisMonthRealizedUsd: paidEvents
      .filter(item => {
        const payoutDate = new Date(item.payoutDate)
        return payoutDate.getFullYear() === now.getFullYear() && payoutDate.getMonth() === now.getMonth()
      })
      .reduce((sum, item) => sum + item.netUsd, 0),
    monthlyRunRateUsd,
    avgYieldPerMonthPct:
      activeApprovedAllocationUsd > 0 ? (monthlyRunRateUsd / activeApprovedAllocationUsd) * 100 : 0,
    nextPayoutNetUsd: nextScheduledEvent?.netUsd ?? 0,
    nextPayoutDate: nextScheduledEvent?.payoutDate ?? null,
    nextPayoutProperty: nextScheduledEvent?.property ?? null,
    upcomingPayoutsNetUsd: scheduledEvents.reduce((sum, item) => sum + item.netUsd, 0),
    approvedCount: approvedPositions.length,
    activeApprovedCount: activeApprovedPositions.length,
    pendingCount: positions.filter(
      position => position.status === 'submitted' || position.status === 'under_review',
    ).length,
    portfolioAllocationUsd: positions.reduce((sum, position) => sum + position.allocationUsd, 0),
  }

  return {
    positions,
    payouts,
    withdrawals,
    summary,
    availableWithdrawalUsd,
    canRequestWithdrawal,
    nextWithdrawalEligibleAt,
    canCreateNewBuyIn: !hasPendingBuyIn,
  }
}
