import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

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
      { day: string; total: Prisma.Decimal }[]
    >`
      SELECT DATE(created_at) as day, SUM(amount_usd) as total
      FROM payments
      WHERE status = 'confirmed'
        AND created_at >= ${startDate}
        AND created_at < ${addDaysUTC(endDate, 1)}
      GROUP BY day
      ORDER BY day ASC
    `

    const userRows = await prisma.$queryRaw<
      { day: string; total: bigint }[]
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

    const planRows = await prisma.userPlan.findMany({
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

    const revenueMap = new Map<string, number>()
    for (const row of revenueRows) {
      revenueMap.set(row.day, Number(row.total))
    }

    const usersMap = new Map<string, number>()
    for (const row of userRows) {
      usersMap.set(row.day, Number(row.total))
    }

    const revenueSeries: { date: string; value: number }[] = []
    const newUsersSeries: { date: string; value: number }[] = []
    const activeUsersSeries: { date: string; value: number }[] = []

    for (let i = 0; i < rangeDays; i += 1) {
      const day = addDaysUTC(startDate, i)
      const key = day.toISOString().slice(0, 10)
      const revenue = revenueMap.get(key) || 0
      const newUsers = usersMap.get(key) || 0

      const activeCount = activePlans.reduce((sum, plan) => {
        if (!plan.startDate) return sum
        const start = startOfDayUTC(plan.startDate)
        const end = plan.endDate ? startOfDayUTC(plan.endDate) : null
        if (day < start) return sum
        if (end && day > end) return sum
        return sum + 1
      }, 0)

      revenueSeries.push({ date: key, value: revenue })
      newUsersSeries.push({ date: key, value: newUsers })
      activeUsersSeries.push({ date: key, value: activeCount })
    }

    const planPopularityMap = new Map<string, number>()
    for (const row of planRows) {
      const name = row.plan?.name || 'Unknown'
      planPopularityMap.set(name, (planPopularityMap.get(name) || 0) + 1)
    }
    const planPopularity = Array.from(planPopularityMap.entries()).map(([name, count]) => ({
      name,
      count,
    }))

    const approvalRate = totalPayments > 0 ? Math.round((confirmedPayments / totalPayments) * 100) : 0

    return NextResponse.json({
      rangeDays,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      revenueSeries,
      newUsersSeries,
      activeUsersSeries,
      planPopularity,
      approvals: {
        confirmed: confirmedPayments,
        total: totalPayments,
        rate: approvalRate,
      },
    })
  } catch (error) {
    console.error('Admin analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
