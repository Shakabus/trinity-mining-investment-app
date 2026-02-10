import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Users, CreditCard, TrendingUp, Activity, Banknote, Building2 } from 'lucide-react'
import AdminAnalytics from '@/components/admin/AdminAnalytics'

export const dynamic = 'force-dynamic'

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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Total Users */}
        <div 
          className="p-6 rounded-3xl"
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
        </div>

        {/* Active Users */}
        <div 
          className="p-6 rounded-3xl"
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
        </div>

        {/* Pending Payments */}
        <div 
          className="p-6 rounded-3xl"
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
        </div>

        {/* Total Revenue */}
        <div 
          className="p-6 rounded-3xl"
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
        </div>
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
