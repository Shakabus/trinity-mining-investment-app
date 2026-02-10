import { prisma } from '@/lib/db'

const REAL_ESTATE_TICKET_PREFIX = 'Real Estate Buy-In Proof -'

export type RealEstatePositionStatus = 'submitted' | 'under_review' | 'approved'

export type RealEstatePosition = {
  id: number
  property: string
  location: string
  tier: string
  allocationUsd: number
  duration: string
  coinType: string
  txid: string
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
  coinType: string
  txid: string
}

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
  coinType: parseLabel(body, 'Payment Coin'),
  txid: parseLabel(body, 'TXID'),
})

const mapTicketStatus = (status: string): RealEstatePositionStatus => {
  if (status === 'closed') return 'approved'
  if (status === 'waiting') return 'under_review'
  return 'submitted'
}

export async function getRealEstateDashboardData(clerkUserId: string): Promise<{
  positions: RealEstatePosition[]
  payouts: RealEstatePayoutEvent[]
  withdrawals: RealEstateWithdrawal[]
  availableWithdrawalUsd: number
}> {
  const user = await prisma.user.findUnique({
    where: { clerkUserId },
    include: {
      supportTickets: {
        where: {
          subject: {
            startsWith: REAL_ESTATE_TICKET_PREFIX,
          },
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
    }
  }

  const positions: RealEstatePosition[] = user.supportTickets.map(ticket => {
    const userMessage = ticket.messages.find(message => message.senderRole === 'user')
    const parsed = parseTicketBody(userMessage?.body || '')
    const txidCompact = parsed.txid ? `${parsed.txid.slice(0, 10)}...${parsed.txid.slice(-6)}` : '-'

    return {
      id: ticket.id,
      property: parsed.property || 'Property Not Parsed',
      location: parsed.location || 'Location Not Parsed',
      tier: parsed.tier || 'Tier Not Parsed',
      allocationUsd: parseAmount(parsed.minimum),
      duration: parsed.duration || '-',
      coinType: parsed.coinType || '-',
      txid: txidCompact,
      submittedAt: ticket.createdAt.toISOString(),
      status: mapTicketStatus(ticket.status),
    }
  })

  return {
    positions,
    payouts: [],
    withdrawals: [],
    availableWithdrawalUsd: 0,
  }
}

