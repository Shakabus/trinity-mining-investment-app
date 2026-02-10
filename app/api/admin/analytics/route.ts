import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { REAL_ESTATE_BUY_IN_TICKET_PREFIX } from '@/lib/real-estate-dashboard'

function clampRange(value: number) {
  if (value === 7 || value === 30 || value === 90) return value
  return 30
}

function startOfDayUTC(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function addDaysUTC(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function dayKey(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'string') {
    if (value.length >= 10) return value.slice(0, 10)
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  }
  return ''
}

function parseAmount(value: string) {
  const num = Number(value.replace(/[^0-9.]/g, ''))
  return Number.isFinite(num) ? num : 0
}

function parseLabel(body: string, label: string) {
  const regex = new RegExp(`^${label}:\\s*(.+)$`, 'im')
  const match = body.match(regex)
  return match?.[1]?.trim() ?? ''
}

function parseDurationMonths(value: string) {
  const match = value.match(/(\d+)\s*month/i)
  if (!match) return 0
  const months = Number(match[1])
  return Number.isFinite(months) ? months : 0
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUser = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    })

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const rangeDays = clampRange(Number(searchParams.get('range') || 30))

    const endDate = startOfDayUTC(new Date())
    const startDate = addDaysUTC(endDate, -(rangeDays - 1))

    const revenueRows = await prisma.$queryRaw<
      { day: Date | string; total: Prisma.Decimal }[]
    >`
      SELECT DATE(created_at) as day, SUM(amount_usd) as total
      FROM payments
      WHERE status = 'confirmed'
        AND created_at >= ${startDate}
        AND created_at < ${addDaysUTC(endDate, 1)}
      GROUP BY day
      ORDER BY day ASC
    `

    const tradingRevenueRows = await prisma.$queryRaw<
      { day: Date | string; total: Prisma.Decimal }[]
    >`
      SELECT DATE(created_at) as day, SUM(amount_usd) as total
      FROM trading_payments
      WHERE status = 'confirmed'
        AND created_at >= ${startDate}
        AND created_at < ${addDaysUTC(endDate, 1)}
      GROUP BY day
      ORDER BY day ASC
    `

    const userRows = await prisma.$queryRaw<
      { day: Date | string; total: bigint }[]
    >`
      SELECT DATE(created_at) as day, COUNT(*) as total
      FROM users
      WHERE created_at >= ${startDate}
        AND created_at < ${addDaysUTC(endDate, 1)}
      GROUP BY day
      ORDER BY day ASC
    `

    const activePlans = await prisma.userPlan.findMany({
      where: {
        status: 'active',
      },
      select: {
        startDate: true,
        endDate: true,
      },
    })

    const activeTradingPlans = await prisma.tradingUserPlan.findMany({
      where: {
        status: 'active',
      },
      select: {
        startDate: true,
        endDate: true,
      },
    })

    const planRows = await prisma.userPlan.findMany({
      select: {
        plan: { select: { name: true } },
      },
    })

    const tradingPlanRows = await prisma.tradingUserPlan.findMany({
      select: {
        plan: { select: { name: true } },
      },
    })

    const confirmedPayments = await prisma.payment.count({
      where: {
        status: 'confirmed',
        createdAt: {
          gte: startDate,
          lt: addDaysUTC(endDate, 1),
        },
      },
    })

    const totalPayments = await prisma.payment.count({
      where: {
        createdAt: {
          gte: startDate,
          lt: addDaysUTC(endDate, 1),
        },
      },
    })

    const confirmedTradingPayments = await prisma.tradingPayment.count({
      where: {
        status: 'confirmed',
        createdAt: {
          gte: startDate,
          lt: addDaysUTC(endDate, 1),
        },
      },
    })

    const totalTradingPayments = await prisma.tradingPayment.count({
      where: {
        createdAt: {
          gte: startDate,
          lt: addDaysUTC(endDate, 1),
        },
      },
    })

    const realEstateBuyInTickets = await prisma.supportTicket.findMany({
      where: {
        subject: { startsWith: REAL_ESTATE_BUY_IN_TICKET_PREFIX },
        createdAt: {
          gte: startDate,
          lt: addDaysUTC(endDate, 1),
        },
      },
      include: {
        messages: {
          where: { senderRole: 'user' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    const realEstateApprovedTickets = await prisma.supportTicket.findMany({
      where: {
        subject: { startsWith: REAL_ESTATE_BUY_IN_TICKET_PREFIX },
        status: 'closed',
      },
      include: {
        messages: {
          where: { senderRole: 'user' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    const revenueMap = new Map<string, number>()
    for (const row of revenueRows) {
      const key = dayKey(row.day)
      if (!key) continue
      revenueMap.set(key, (revenueMap.get(key) || 0) + Number(row.total))
    }

    for (const row of tradingRevenueRows) {
      const key = dayKey(row.day)
      if (!key) continue
      revenueMap.set(key, (revenueMap.get(key) || 0) + Number(row.total))
    }

    const realEstateRevenueByDay = new Map<string, number>()
    let confirmedRealEstatePayments = 0
    for (const ticket of realEstateBuyInTickets) {
      const body = ticket.messages[0]?.body || ''
      const amount = parseAmount(parseLabel(body, 'Minimum'))
      const key = ticket.createdAt.toISOString().slice(0, 10)
      if (ticket.status === 'closed') {
        confirmedRealEstatePayments += 1
        realEstateRevenueByDay.set(key, (realEstateRevenueByDay.get(key) || 0) + amount)
      }
    }

    for (const [key, value] of realEstateRevenueByDay.entries()) {
      revenueMap.set(key, (revenueMap.get(key) || 0) + value)
    }

    const usersMap = new Map<string, number>()
    for (const row of userRows) {
      const key = dayKey(row.day)
      if (!key) continue
      usersMap.set(key, Number(row.total))
    }

    const revenueSeries: { date: string; value: number }[] = []
    const newUsersSeries: { date: string; value: number }[] = []
    const activeUsersSeries: { date: string; value: number }[] = []

    for (let i = 0; i < rangeDays; i += 1) {
      const day = addDaysUTC(startDate, i)
      const key = day.toISOString().slice(0, 10)
      const revenue = revenueMap.get(key) || 0
      const newUsers = usersMap.get(key) || 0

      const activeMiningCount = activePlans.reduce((sum, plan) => {
        if (!plan.startDate) return sum
        const start = startOfDayUTC(plan.startDate)
        const end = plan.endDate ? startOfDayUTC(plan.endDate) : null
        if (day < start) return sum
        if (end && day > end) return sum
        return sum + 1
      }, 0)

      const activeTradingCount = activeTradingPlans.reduce((sum, plan) => {
        if (!plan.startDate) return sum
        const start = startOfDayUTC(plan.startDate)
        const end = plan.endDate ? startOfDayUTC(plan.endDate) : null
        if (day < start) return sum
        if (end && day > end) return sum
        return sum + 1
      }, 0)

      const activeRealEstateCount = realEstateApprovedTickets.reduce((sum, ticket) => {
        const body = ticket.messages[0]?.body || ''
        const cycleMonths = parseDurationMonths(parseLabel(body, 'Duration'))
        if (cycleMonths <= 0) return sum
        const start = startOfDayUTC(ticket.createdAt)
        const end = addDaysUTC(start, cycleMonths * 30)
        if (day < start || day > end) return sum
        return sum + 1
      }, 0)

      const activeCount = activeMiningCount + activeTradingCount + activeRealEstateCount

      revenueSeries.push({ date: key, value: revenue })
      newUsersSeries.push({ date: key, value: newUsers })
      activeUsersSeries.push({ date: key, value: activeCount })
    }

    const planPopularityMap = new Map<string, number>()
    for (const row of planRows) {
      const name = row.plan?.name || 'Unknown'
      planPopularityMap.set(name, (planPopularityMap.get(name) || 0) + 1)
    }
    for (const row of tradingPlanRows) {
      const name = row.plan?.name || 'Unknown Trading Plan'
      planPopularityMap.set(name, (planPopularityMap.get(name) || 0) + 1)
    }
    const planPopularity = Array.from(planPopularityMap.entries()).map(([name, count]) => ({
      name,
      count,
    }))

    const totalApprovalScope = totalPayments + totalTradingPayments + realEstateBuyInTickets.length
    const confirmedApprovalScope =
      confirmedPayments + confirmedTradingPayments + confirmedRealEstatePayments
    const approvalRate =
      totalApprovalScope > 0 ? Math.round((confirmedApprovalScope / totalApprovalScope) * 100) : 0

    return NextResponse.json({
      rangeDays,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      revenueSeries,
      newUsersSeries,
      activeUsersSeries,
      planPopularity,
      approvals: {
        confirmed: confirmedApprovalScope,
        total: totalApprovalScope,
        rate: approvalRate,
      },
    })
  } catch (error) {
    console.error('Admin analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
