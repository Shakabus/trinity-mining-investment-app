import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ACCOUNT_BALANCE_ENTRY_ACTION, parseAccountBalanceEntryDetail } from '@/lib/account-balance'
import { runKycQuery } from '@/lib/kyc-db'
import {
  REAL_ESTATE_BUY_IN_TICKET_PREFIX,
  REAL_ESTATE_WITHDRAWAL_TICKET_PREFIX,
} from '@/lib/real-estate-dashboard'

export const dynamic = 'force-dynamic'

const MAX_ACCOUNT_ACTIVITY_LOOKBACK = 1200

type DotCounts = Record<string, number>

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const [miningPayments, tradingPayments, referralAvailable, waitingSupport, realEstateActionCount, pendingWithdrawals, pendingTradingWithdrawals, pendingReferralWithdrawals, kycRow, accountEntries] =
      await Promise.all([
        prisma.userPlan.count({
          where: {
            userId: user.id,
            paymentStatus: 'pending',
            status: { in: ['awaiting_payment', 'selected'] },
          },
        }),
        prisma.tradingUserPlan.count({
          where: {
            userId: user.id,
            paymentStatus: 'pending',
            status: { in: ['awaiting_payment', 'selected'] },
          },
        }),
        prisma.referralBonus.count({
          where: {
            referrerId: user.id,
            status: 'available',
          },
        }),
        prisma.supportTicket.count({
          where: {
            userId: user.id,
            status: 'waiting',
          },
        }),
        prisma.supportTicket.count({
          where: {
            userId: user.id,
            status: { in: ['waiting', 'rejected'] },
            OR: [
              { subject: { startsWith: REAL_ESTATE_BUY_IN_TICKET_PREFIX } },
              { subject: { startsWith: REAL_ESTATE_WITHDRAWAL_TICKET_PREFIX } },
            ],
          },
        }),
        prisma.withdrawal.count({
          where: {
            userId: user.id,
            status: 'pending',
          },
        }),
        prisma.tradingWithdrawal.count({
          where: {
            userId: user.id,
            status: 'pending',
          },
        }),
        prisma.referralWithdrawal.count({
          where: {
            userId: user.id,
            status: 'pending',
          },
        }),
        runKycQuery(() =>
          prisma.userKyc.findUnique({
            where: { userId: user.id },
            select: { status: true },
          })
        ),
        prisma.userActivityLog.findMany({
          where: {
            userId: user.id,
            action: ACCOUNT_BALANCE_ENTRY_ACTION,
            OR: [
              { detail: { contains: '"source":"funding_deposit"' } },
              { detail: { contains: '"source":"account_balance_withdrawal"' } },
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: MAX_ACCOUNT_ACTIVITY_LOOKBACK,
          select: { detail: true },
        }),
      ])

    const latestByReference = new Map<string, { source: string; status: string }>()
    for (const row of accountEntries) {
      const parsed = parseAccountBalanceEntryDetail(row.detail)
      if (!parsed) continue
      if (parsed.source !== 'funding_deposit' && parsed.source !== 'account_balance_withdrawal') continue
      const key = `${parsed.source}:${parsed.referenceId}`
      if (!latestByReference.has(key)) {
        latestByReference.set(key, { source: parsed.source, status: parsed.status })
      }
    }

    let fundingRequests = 0
    let accountWithdrawals = 0
    for (const entry of latestByReference.values()) {
      if (entry.source === 'funding_deposit' && (entry.status === 'pending' || entry.status === 'rejected')) {
        fundingRequests += 1
      }
      if (entry.source === 'account_balance_withdrawal' && entry.status === 'pending') {
        accountWithdrawals += 1
      }
    }

    const kycRequired = !kycRow.tableMissing && (!kycRow.value || kycRow.value.status !== 'approved') ? 1 : 0

    const dots: DotCounts = {
      miningPayments,
      tradingPayments,
      realEstate: realEstateActionCount,
      referrals: referralAvailable,
      funding: fundingRequests,
      withdrawals:
        pendingWithdrawals +
        pendingTradingWithdrawals +
        pendingReferralWithdrawals +
        accountWithdrawals,
      kyc: kycRequired,
      support: waitingSupport,
    }

    return NextResponse.json(
      {
        dots,
        generatedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'private, max-age=0, no-cache' } }
    )
  } catch (error) {
    console.error('User notification dots error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
