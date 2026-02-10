import { prisma } from '@/lib/db'

export const REAL_ESTATE_BUY_IN_TICKET_PREFIX = 'Real Estate Buy-In Proof -'
export const REAL_ESTATE_WITHDRAWAL_TICKET_PREFIX = 'Real Estate Withdrawal Request -'

export type RealEstatePositionStatus = 'submitted' | 'under_review' | 'approved'

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
  submittedAt: string
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

  const positions: RealEstatePosition[] = buyInTickets.map(ticket => {
    const userMessage = ticket.messages.find(message => message.senderRole === 'user')
    const parsed = parseTicketBody(userMessage?.body || '')
    const cycleMonths = parseDurationMonths(parsed.duration)
    const projectedBand = parseProjectedBandPercent(parsed.projectedBand)
    const midpointPct = (projectedBand.low + projectedBand.high) / 2
    const allocationUsd = parseAmount(parsed.minimum)
    const totalCycleIncome = allocationUsd * (midpointPct / 100)
    const monthlyIncomeUsd = cycleMonths > 0 ? totalCycleIncome / cycleMonths : 0
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
      submittedAt: ticket.createdAt.toISOString(),
      status: mapBuyInTicketStatus(ticket.status),
    }
  })

  const approvedPositions = positions.filter(position => position.status === 'approved')
  const now = new Date()

  const payouts: RealEstatePayoutEvent[] = []
  for (const position of approvedPositions) {
    if (position.cycleMonths <= 0 || position.monthlyIncomeUsd <= 0) continue

    const startedAt = new Date(position.submittedAt)
    const elapsedMonths = Math.min(monthsBetween(startedAt, now), position.cycleMonths)

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
    addMonths(new Date(position.submittedAt), WITHDRAWAL_WINDOW_MONTHS),
  )
  const firstMaturityDate =
    earliestMaturityDates.length > 0
      ? new Date(Math.min(...earliestMaturityDates.map(date => date.getTime())))
      : null

  const hasMaturedAllocation = earliestMaturityDates.some(date => date <= now)

  const unlockedNetIncome = approvedPositions.reduce((sum, position) => {
    if (position.cycleMonths <= 0 || position.monthlyIncomeUsd <= 0) return sum

    const startedAt = new Date(position.submittedAt)
    const maturedAt = addMonths(startedAt, WITHDRAWAL_WINDOW_MONTHS)
    if (maturedAt > now) return sum

    const elapsedMonths = Math.min(monthsBetween(startedAt, now), position.cycleMonths)
    const monthlyNet = position.monthlyIncomeUsd * (1 - PAYOUT_FEE_RATE)
    return sum + elapsedMonths * monthlyNet
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

  const hasPendingBuyIn = positions.some(position => position.status !== 'approved')

  return {
    positions,
    payouts,
    withdrawals,
    availableWithdrawalUsd,
    canRequestWithdrawal,
    nextWithdrawalEligibleAt,
    canCreateNewBuyIn: !hasPendingBuyIn,
  }
}
