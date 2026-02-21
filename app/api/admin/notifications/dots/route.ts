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

const MAX_ACCOUNT_ACTIVITY_LOOKBACK = 10000

type DotCounts = Record<string, number>

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUser = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true, role: true },
    })

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = Date.now()
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000)

    const [newUsers, pendingMiningPayments, pendingTradingPayments, pendingRealEstateBuyIns, pendingMiningWithdrawals, pendingTradingWithdrawals, pendingReferralWithdrawals, pendingRealEstateWithdrawals, pendingReferralQueue, kycPending, supportNeedsReply, balanceActivity] =
      await Promise.all([
        prisma.user.count({
          where: {
            createdAt: { gte: oneDayAgo },
            role: 'user',
          },
        }),
        prisma.userPlan.count({
          where: {
            status: 'awaiting_payment',
            paymentStatus: 'pending',
            payments: { some: { status: 'pending' } },
          },
        }),
        prisma.tradingUserPlan.count({
          where: {
            status: { in: ['awaiting_payment', 'selected'] },
            paymentStatus: 'pending',
            payments: { some: { status: 'pending' } },
          },
        }),
        prisma.supportTicket.count({
          where: {
            subject: { startsWith: REAL_ESTATE_BUY_IN_TICKET_PREFIX },
            status: { in: ['open', 'waiting'] },
          },
        }),
        prisma.withdrawal.count({ where: { status: 'pending' } }),
        prisma.tradingWithdrawal.count({ where: { status: 'pending' } }),
        prisma.referralWithdrawal.count({ where: { status: 'pending' } }),
        prisma.supportTicket.count({
          where: {
            subject: { startsWith: REAL_ESTATE_WITHDRAWAL_TICKET_PREFIX },
            status: { in: ['open', 'waiting'] },
          },
        }),
        prisma.referralWithdrawal.count({ where: { status: 'pending' } }),
        runKycQuery(() =>
          prisma.userKyc.count({
            where: { status: { in: ['submitted', 'pending', 'under_review'] } },
          })
        ),
        prisma.supportTicket.count({
          where: {
            status: { in: ['open', 'waiting'] },
            NOT: {
              OR: [
                { subject: { startsWith: REAL_ESTATE_BUY_IN_TICKET_PREFIX } },
                { subject: { startsWith: REAL_ESTATE_WITHDRAWAL_TICKET_PREFIX } },
              ],
            },
          },
        }),
        prisma.userActivityLog.findMany({
          where: {
            action: ACCOUNT_BALANCE_ENTRY_ACTION,
            OR: [
              { detail: { contains: '"source":"funding_deposit"' } },
              { detail: { contains: '"source":"account_balance_withdrawal"' } },
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: MAX_ACCOUNT_ACTIVITY_LOOKBACK,
          select: { detail: true, userId: true },
        }),
      ])

    const latestByReference = new Map<string, { source: string; status: string }>()
    for (const row of balanceActivity) {
      const parsed = parseAccountBalanceEntryDetail(row.detail)
      if (!parsed) continue
      if (parsed.source !== 'funding_deposit' && parsed.source !== 'account_balance_withdrawal') continue
      const key = `${row.userId}:${parsed.source}:${parsed.referenceId}`
      if (!latestByReference.has(key)) {
        latestByReference.set(key, { source: parsed.source, status: parsed.status })
      }
    }

    let pendingFundingRequests = 0
    let pendingAccountWithdrawalApprovals = 0
    for (const entry of latestByReference.values()) {
      if (entry.source === 'funding_deposit' && entry.status === 'pending') {
        pendingFundingRequests += 1
      }
      if (entry.source === 'account_balance_withdrawal' && entry.status === 'pending') {
        pendingAccountWithdrawalApprovals += 1
      }
    }

    const pendingPayments = pendingMiningPayments + pendingTradingPayments + pendingRealEstateBuyIns

    const dots: DotCounts = {
      users: newUsers,
      payments: pendingPayments,
      properties: pendingRealEstateBuyIns + pendingRealEstateWithdrawals,
      accountBalance: pendingFundingRequests + pendingAccountWithdrawalApprovals,
      kyc: kycPending.tableMissing ? 0 : Number(kycPending.value ?? 0),
      withdrawals:
        pendingMiningWithdrawals +
        pendingTradingWithdrawals +
        pendingReferralWithdrawals +
        pendingRealEstateWithdrawals,
      referrals: pendingReferralQueue,
      support: supportNeedsReply,
    }

    return NextResponse.json(
      {
        dots,
        generatedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'private, max-age=0, no-cache' } }
    )
  } catch (error) {
    console.error('Admin notification dots error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
