import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import Link from 'next/link'
import { Users, CreditCard, TrendingUp, Activity, Banknote, Building2, BellRing, Clock3 } from 'lucide-react'
import AdminAnalytics from '@/components/admin/AdminAnalytics'

export const dynamic = 'force-dynamic'

const REWARD_SOON_WINDOW_HOURS = 24

type RewardAlert = {
  id: string
  userId: number
  userName: string
  planType: 'mining' | 'trading'
  planName: string
  dueAt: Date
  amountUsd: number
}

type TradingRewardCandidate = {
  id: number
  status: string
  endDate: Date | string | null
  createdAt: Date | string
  durationHours: number
  expectedReturnUsd: Prisma.Decimal | number
  planName: string | null
  userId: number
  userFullName: string | null
  userEmail: string | null
  totalEarnedUsd: Prisma.Decimal | number
}

function resolveUserName(fullName: string | null, email: string | null, userId: number) {
  if (fullName && fullName.trim().length > 0) return fullName.trim()
  if (email && email.trim().length > 0) return email.trim()
  return `User #${userId}`
}

export default async function AdminPage() {
  // Get statistics
  const totalUsers = await prisma.user.count()
  const activeUsers = await prisma.user.count({
    where: { accountStatus: 'active' }
  })
  const pendingPayments = await prisma.userPlan.count({
    where: { 
      status: 'awaiting_payment',
      paymentStatus: 'pending'
    }
  })
  const pendingWithdrawals = await prisma.withdrawal.count({
    where: { status: 'pending' },
  })
  const pendingReferralWithdrawals = await prisma.referralWithdrawal.count({
    where: { status: 'pending' },
  })
  const confirmedPayments = await prisma.payment.aggregate({
    where: { status: 'confirmed' },
    _sum: { amountUsd: true },
  })

  const revenue = confirmedPayments._sum.amountUsd
    ? parseFloat(confirmedPayments._sum.amountUsd.toString())
    : 0

  const processedWithdrawals = await prisma.withdrawal.aggregate({
    where: { status: 'processed' },
    _sum: { amountUsd: true },
  })

  const processedReferralWithdrawals = await prisma.referralWithdrawal.aggregate({
    where: { status: 'processed' },
    _sum: { amountUsd: true },
  })

  const processedEarningsUsd = processedWithdrawals._sum.amountUsd
    ? parseFloat(processedWithdrawals._sum.amountUsd.toString())
    : 0

  const processedReferralUsd = processedReferralWithdrawals._sum.amountUsd
    ? parseFloat(processedReferralWithdrawals._sum.amountUsd.toString())
    : 0

  const processedTotalUsd = processedEarningsUsd + processedReferralUsd
  const now = new Date()
  const rewardSoonCutoff = new Date(now.getTime() + REWARD_SOON_WINDOW_HOURS * 60 * 60 * 1000)

  const [miningRewardCandidates, tradingRewardCandidates] = await Promise.all([
    prisma.userPlan.findMany({
      where: {
        paymentStatus: 'confirmed',
        status: { in: ['active', 'completed'] },
      },
      select: {
        id: true,
        status: true,
        startDate: true,
        createdAt: true,
        plan: { select: { name: true } },
        user: { select: { id: true, fullName: true, email: true } },
        earnings: {
          select: {
            totalEarnedUsd: true,
            isHistorical: true,
          },
        },
      },
      take: 500,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.$queryRaw<TradingRewardCandidate[]>(
      Prisma.sql`
        SELECT
          tup.id,
          tup.status,
          tup.end_date AS endDate,
          tup.created_at AS createdAt,
          tup.duration_hours AS durationHours,
          tup.expected_return_usd AS expectedReturnUsd,
          tp.name AS planName,
          u.id AS userId,
          u.full_name AS userFullName,
          u.email AS userEmail,
          COALESCE(SUM(te.total_earned_usd), 0) AS totalEarnedUsd
        FROM trading_user_plans tup
        LEFT JOIN trading_plans tp ON tp.id = tup.plan_id
        LEFT JOIN users u ON u.id = tup.user_id
        LEFT JOIN trading_earnings te ON te.trading_user_plan_id = tup.id
        WHERE tup.payment_status = 'confirmed'
          AND tup.status IN ('active', 'completed')
        GROUP BY
          tup.id,
          tup.status,
          tup.end_date,
          tup.created_at,
          tup.duration_hours,
          tup.expected_return_usd,
          tp.name,
          u.id,
          u.full_name,
          u.email
        ORDER BY tup.created_at DESC
        LIMIT 500
      `
    ),
  ])

  const rewardAlertsDueNow: RewardAlert[] = []
  const rewardAlertsSoon: RewardAlert[] = []

  for (const plan of miningRewardCandidates) {
    const referenceStart = plan.startDate ?? plan.createdAt
    const unlockAt = new Date(referenceStart.getTime() + 2 * 24 * 60 * 60 * 1000)
    const isDueNow = plan.status === 'completed' || unlockAt.getTime() <= now.getTime()
    const isDueSoon = !isDueNow && unlockAt.getTime() <= rewardSoonCutoff.getTime()
    if (!isDueNow && !isDueSoon) continue

    const earnedUsd = plan.earnings
      .filter(entry => !entry.isHistorical)
      .reduce((sum, entry) => sum + Number(entry.totalEarnedUsd || 0), 0)

    const alert: RewardAlert = {
      id: `mining-${plan.id}`,
      userId: plan.user.id,
      userName: resolveUserName(plan.user.fullName, plan.user.email, plan.user.id),
      planType: 'mining',
      planName: plan.plan.name,
      dueAt: unlockAt,
      amountUsd: Math.max(0, earnedUsd),
    }

    if (isDueNow) rewardAlertsDueNow.push(alert)
    else rewardAlertsSoon.push(alert)
  }

  for (const plan of tradingRewardCandidates) {
    const createdAt = plan.createdAt instanceof Date ? plan.createdAt : new Date(plan.createdAt)
    const endDate = plan.endDate ? (plan.endDate instanceof Date ? plan.endDate : new Date(plan.endDate)) : null
    const dueAt = endDate ?? new Date(createdAt.getTime() + plan.durationHours * 60 * 60 * 1000)
    const isDueNow = plan.status === 'completed' || dueAt.getTime() <= now.getTime()
    const isDueSoon = !isDueNow && dueAt.getTime() <= rewardSoonCutoff.getTime()
    if (!isDueNow && !isDueSoon) continue

    const earnedUsd = Number(plan.totalEarnedUsd || 0)
    const fallbackExpectedUsd = Number(plan.expectedReturnUsd || 0)

    const alert: RewardAlert = {
      id: `trading-${plan.id}`,
      userId: plan.userId,
      userName: resolveUserName(plan.userFullName, plan.userEmail, plan.userId),
      planType: 'trading',
      planName: plan.planName || 'Trading plan',
      dueAt,
      amountUsd: Math.max(0, earnedUsd || fallbackExpectedUsd),
    }

    if (isDueNow) rewardAlertsDueNow.push(alert)
    else rewardAlertsSoon.push(alert)
  }

  rewardAlertsDueNow.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
  rewardAlertsSoon.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          Admin Overview
        </h1>
        <p className="text-white/70">
          Monitor platform performance and manage operations
        </p>
      </div>

      <div
        className="p-6 md:p-8 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div
              className="p-3 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(29, 78, 216, 0.2))',
              }}
            >
              <BellRing size={22} className="text-blue-300" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Reward Due Notifications</h2>
              <p className="text-sm text-white/60">
                Alerts for client rewards that are due now or due within {REWARD_SOON_WINDOW_HOURS} hours.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.45)',
                color: '#fecaca',
              }}
            >
              Due now: {rewardAlertsDueNow.length}
            </span>
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: 'rgba(234, 179, 8, 0.2)',
                border: '1px solid rgba(234, 179, 8, 0.45)',
                color: '#fde68a',
              }}
            >
              Due soon: {rewardAlertsSoon.length}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div
            className="p-5 rounded-2xl"
            style={{
              background: 'rgba(239, 68, 68, 0.06)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Clock3 size={16} className="text-rose-300" />
              <h3 className="text-white font-semibold">Due now</h3>
            </div>
            {rewardAlertsDueNow.length ? (
              <div className="space-y-3">
                {rewardAlertsDueNow.slice(0, 10).map(alert => (
                  <div key={alert.id} className="text-sm">
                    <div className="text-white font-medium">{alert.userName}</div>
                    <div className="text-white/65">
                      {alert.planType === 'mining' ? 'Mining' : 'Trading'} - {alert.planName}
                    </div>
                    <div className="text-rose-200 text-xs">
                      Due since {alert.dueAt.toLocaleString()} • Estimated reward ${alert.amountUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-white/55">No reward due notifications right now.</div>
            )}
          </div>

          <div
            className="p-5 rounded-2xl"
            style={{
              background: 'rgba(234, 179, 8, 0.06)',
              border: '1px solid rgba(234, 179, 8, 0.25)',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Clock3 size={16} className="text-amber-300" />
              <h3 className="text-white font-semibold">Due soon</h3>
            </div>
            {rewardAlertsSoon.length ? (
              <div className="space-y-3">
                {rewardAlertsSoon.slice(0, 10).map(alert => (
                  <div key={alert.id} className="text-sm">
                    <div className="text-white font-medium">{alert.userName}</div>
                    <div className="text-white/65">
                      {alert.planType === 'mining' ? 'Mining' : 'Trading'} - {alert.planName}
                    </div>
                    <div className="text-amber-200 text-xs">
                      Due at {alert.dueAt.toLocaleString()} • Estimated reward ${alert.amountUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-white/55">No upcoming reward notifications in the next {REWARD_SOON_WINDOW_HOURS} hours.</div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Total Users */}
        <Link
          href="/admin/users"
          className="p-6 rounded-3xl block transition-transform hover:scale-[1.01]"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="p-3 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(88, 45, 255, 0.3), rgba(58, 19, 122, 0.2))',
              }}
            >
              <Users size={24} className="text-white" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{totalUsers}</div>
          <div className="text-sm text-white/60">Total Users</div>
          <div className="text-xs text-white/45 mt-2">Open source data</div>
        </Link>

        {/* Active Users */}
        <Link
          href="/admin/users"
          className="p-6 rounded-3xl block transition-transform hover:scale-[1.01]"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="p-3 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(22, 163, 74, 0.2))',
              }}
            >
              <Activity size={24} className="text-green-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{activeUsers}</div>
          <div className="text-sm text-white/60">Active Mining</div>
          <div className="text-xs text-white/45 mt-2">Open source data</div>
        </Link>

        {/* Pending Payments */}
        <Link
          href="/admin/payments"
          className="p-6 rounded-3xl block transition-transform hover:scale-[1.01]"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="p-3 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.3), rgba(202, 138, 4, 0.2))',
              }}
            >
              <CreditCard size={24} className="text-yellow-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{pendingPayments}</div>
          <div className="text-sm text-white/60">Pending Payments</div>
          <div className="text-xs text-white/45 mt-2">Open source data</div>
        </Link>

        {/* Total Revenue */}
        <Link
          href="/admin/payments"
          className="p-6 rounded-3xl block transition-transform hover:scale-[1.01]"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="p-3 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(37, 99, 235, 0.2))',
              }}
            >
              <TrendingUp size={24} className="text-blue-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            ${revenue.toLocaleString()}
          </div>
          <div className="text-sm text-white/60">Total Revenue</div>
          <div className="text-xs text-white/45 mt-2">Open source data</div>
        </Link>
      </div>

      <AdminAnalytics />

      {/* Withdrawal Summary */}
      <div
        className="p-6 md:p-8 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        <h2 className="text-xl font-semibold text-white mb-6">Withdrawals Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              label: 'Processed Earnings Withdrawals',
              value: `$${processedEarningsUsd.toLocaleString()}`,
            },
            {
              label: 'Processed Referral Withdrawals',
              value: `$${processedReferralUsd.toLocaleString()}`,
            },
            {
              label: 'Total Processed Withdrawals',
              value: `$${processedTotalUsd.toLocaleString()}`,
            },
          ].map(item => (
            <div
              key={item.label}
              className="p-5 rounded-2xl"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <div className="text-sm text-white/60 mb-1">{item.label}</div>
              <div className="text-2xl font-semibold text-white">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div 
        className="p-6 md:p-8 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        <h2 className="text-xl font-semibold text-white mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link
            href="/admin/users"
            className="p-6 rounded-2xl transition-all hover:scale-105"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div
              className="p-3 rounded-xl mb-3 float-soft"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.03))',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(14px)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                width: 'fit-content',
              }}
            >
              <Users size={28} className="text-white" />
            </div>
            <h3 className="text-white font-semibold mb-2">Manage Users</h3>
            <p className="text-sm text-white/60">
              View and manage all registered users
            </p>
          </Link>

          <Link
            href="/admin/payments"
            className="p-6 rounded-2xl transition-all hover:scale-105"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div
              className="p-3 rounded-xl mb-3 float-soft"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.03))',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(14px)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                width: 'fit-content',
              }}
            >
              <CreditCard size={28} className="text-white" />
            </div>
            <h3 className="text-white font-semibold mb-2">Review Payments</h3>
            <p className="text-sm text-white/60">
              Approve pending payment requests
            </p>
          </Link>

          <Link
            href="/admin/withdrawals"
            className="p-6 rounded-2xl transition-all hover:scale-105"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div
              className="p-3 rounded-xl mb-3 float-soft"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.03))',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(14px)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                width: 'fit-content',
              }}
            >
              <Banknote size={28} className="text-white" />
            </div>
            <h3 className="text-white font-semibold mb-2">Withdrawals</h3>
            <p className="text-sm text-white/60">
              {pendingWithdrawals} earnings pending, {pendingReferralWithdrawals} referral pending
            </p>
          </Link>

          <Link
            href="/admin/real-estate"
            className="p-6 rounded-2xl transition-all hover:scale-105"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div
              className="p-3 rounded-xl mb-3 float-soft"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.03))',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(14px)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                width: 'fit-content',
              }}
            >
              <Building2 size={28} className="text-white" />
            </div>
            <h3 className="text-white font-semibold mb-2">Manage Properties</h3>
            <p className="text-sm text-white/60">
              Create, edit, and remove real-estate listings
            </p>
          </Link>

          <Link
            href="/dashboard"
            className="p-6 rounded-2xl transition-all hover:scale-105"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div
              className="p-3 rounded-xl mb-3 float-soft"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.03))',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(14px)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                width: 'fit-content',
              }}
            >
              <Activity size={28} className="text-white" />
            </div>
            <h3 className="text-white font-semibold mb-2">User Dashboard</h3>
            <p className="text-sm text-white/60">
              View platform as a user
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}
