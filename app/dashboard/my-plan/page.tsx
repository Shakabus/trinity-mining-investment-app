import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Calendar, Hash, Zap, TrendingUp, Clock } from 'lucide-react'

export default async function MyPlanPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      userPlans: {
        include: {
          plan: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }
    }
  })

  const totalPaid = await prisma.payment.aggregate({
    where: { userId: user?.id, status: 'confirmed' },
    _sum: { amountUsd: true },
  })
  const totalInvestment = totalPaid._sum.amountUsd
    ? parseFloat(totalPaid._sum.amountUsd.toString())
    : 0

  const activePlan = user?.userPlans.find(plan => plan.status === 'active') || null
  const pendingUpgrade = user?.userPlans.find(
    plan => plan.status === 'awaiting_payment' && plan.upgradeFromPlanId
  ) || null
  const currentPlan = activePlan || pendingUpgrade

  if (!currentPlan) {
    return (
      <div className="max-w-4xl mx-auto px-2 sm:px-4 lg:px-6 py-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">My Plan</h1>
            <p className="text-white/70">View and manage your current mining plan</p>
          </div>

          <div 
            className="p-12 md:p-16 rounded-3xl text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
            }}
          >
            <div className="text-6xl mb-6">📦</div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">No Active Plan</h2>
            <p className="text-white/70 mb-8 max-w-md mx-auto">
              You have not selected a mining plan yet. Choose one to start earning!
            </p>
            <Link
              href="/dashboard/plans"
              className="inline-block px-8 py-4 rounded-full font-semibold transition-all text-lg"
              style={{
                background: 'linear-gradient(135deg, #582dff, #3a137a)',
                color: '#ffffff',
                boxShadow: '0 4px 24px rgba(88, 45, 255, 0.4)',
              }}
            >
              Browse Plans →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Convert Decimals to numbers
  const planData = {
    id: currentPlan.id,
    status: currentPlan.status,
    paymentStatus: currentPlan.paymentStatus,
    planName: currentPlan.plan.name,
    coinType: currentPlan.plan.coinType,
    baseHashrate: parseFloat(currentPlan.plan.baseHashrate.toString()),
    hashrateUnit: currentPlan.plan.hashrateUnit,
    algorithm: currentPlan.plan.algorithm,
    hardwareModel: currentPlan.plan.hardwareModel,
    selectedDurationDays: currentPlan.selectedDurationDays,
    finalPrice: parseFloat(currentPlan.finalPrice.toString()),
    startDate: currentPlan.startDate,
    endDate: currentPlan.endDate,
    createdAt: currentPlan.createdAt
  }

  const now = new Date()
  const effectiveStart = planData.startDate ?? planData.createdAt
  const effectiveEnd = planData.endDate
    ? new Date(planData.endDate)
    : effectiveStart
    ? new Date(effectiveStart.getTime() + planData.selectedDurationDays * 24 * 60 * 60 * 1000)
    : null

  const daysElapsed = effectiveStart
    ? Math.max(0, Math.floor((now.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  const daysRemaining = effectiveEnd
    ? Math.max(0, Math.ceil((effectiveEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : Math.max(0, planData.selectedDurationDays - daysElapsed)

  const progressPercentage = planData.selectedDurationDays > 0
    ? Math.min(100, Math.max(0, (daysElapsed / planData.selectedDurationDays) * 100))
    : 0

  return (
    <div className="w-full px-2 sm:px-4 lg:px-6 py-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">My Plan</h1>
          <p className="text-white/70">Manage your current mining plan</p>
        </div>

        {/* Status Badge */}
        {pendingUpgrade && (
          <div 
            className="p-6 rounded-3xl"
            style={{
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
            }}
          >
            <div className="flex items-start gap-3">
              <Clock size={24} className="text-blue-300 shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-200 mb-2">Upgrade Pending Payment</h3>
                <p className="text-blue-100/80 text-sm mb-4">
                  Your current plan remains active until the upgrade payment is confirmed.
                </p>
                <Link
                  href="/dashboard/payment"
                  className="inline-block px-6 py-2 rounded-full text-sm font-semibold transition-all"
                  style={{
                    background: 'rgba(59, 130, 246, 0.2)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    color: '#bfdbfe',
                  }}
                >
                  Complete Upgrade Payment {'>'}
                </Link>
              </div>
            </div>
          </div>
        )}

        {planData.status === 'awaiting_payment' && !pendingUpgrade && (
          <div 
            className="p-6 rounded-3xl"
            style={{
              background: 'rgba(234, 179, 8, 0.1)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
            }}
          >
            <div className="flex items-start gap-3">
              <Clock size={24} className="text-yellow-300 shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-yellow-300 mb-2">Payment Pending</h3>
                <p className="text-yellow-200/80 text-sm mb-4">
                  Your plan is awaiting payment confirmation. Complete your payment to activate mining.
                </p>
                <Link
                  href="/dashboard/payment"
                  className="inline-block px-6 py-2 rounded-full text-sm font-semibold transition-all"
                  style={{
                    background: 'rgba(234, 179, 8, 0.2)',
                    border: '1px solid rgba(234, 179, 8, 0.4)',
                    color: '#fde047',
                  }}
                >
                  Complete Payment →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Plan Overview Card */}
        <div 
          className="p-6 md:p-8 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                {planData.planName}
              </h2>
              <div className="flex items-center gap-2">
                <span 
                  className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    background: 'rgba(88, 45, 255, 0.2)',
                    border: '1px solid rgba(88, 45, 255, 0.3)',
                    color: '#a78bfa',
                  }}
                >
                  {planData.coinType}
                </span>
                <span 
                  className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    background: planData.status === 'active' 
                      ? 'rgba(34, 197, 94, 0.2)' 
                      : 'rgba(234, 179, 8, 0.2)',
                    border: planData.status === 'active'
                      ? '1px solid rgba(34, 197, 94, 0.3)'
                      : '1px solid rgba(234, 179, 8, 0.3)',
                    color: planData.status === 'active' ? '#86efac' : '#fde047',
                  }}
                >
                  {planData.status === 'active' ? 'ACTIVE' : 'PENDING'}
                </span>
              </div>
            </div>
            <div className="mt-4 md:mt-0 text-right">
              <div className="text-white/60 text-sm mb-1">Total Investment</div>
              <div className="text-3xl font-bold text-white">
                ${totalInvestment.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
                <Hash size={16} />
                <span>Hashrate</span>
              </div>
              <div className="text-xl font-bold text-white">
                {planData.baseHashrate} {planData.hashrateUnit}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
                <Zap size={16} />
                <span>Algorithm</span>
              </div>
              <div className="text-xl font-bold text-white">
                {planData.algorithm}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
                <Calendar size={16} />
                <span>Duration</span>
              </div>
              <div className="text-xl font-bold text-white">
                {planData.selectedDurationDays} days
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
                <TrendingUp size={16} />
                <span>Days Remaining</span>
              </div>
              <div className="text-xl font-bold text-white">
                {daysRemaining}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {planData.status === 'active' && planData.startDate && planData.endDate && (
            <div className="mb-6">
              <div className="flex justify-between text-sm text-white/60 mb-2">
                <span>Contract Progress</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <div 
                className="w-full h-3 rounded-full overflow-hidden"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progressPercentage}%`,
                    background: 'linear-gradient(90deg, #582dff, #3a137a)',
                  }}
                />
              </div>
            </div>
          )}

          {/* Contract Dates */}
          {planData.startDate && planData.endDate && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                className="p-4 rounded-xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <div className="text-white/60 text-sm mb-1">Start Date</div>
                <div className="text-white font-semibold">
                  {new Date(planData.startDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>

              <div 
                className="p-4 rounded-xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <div className="text-white/60 text-sm mb-1">End Date</div>
                <div className="text-white font-semibold">
                  {new Date(planData.endDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hardware Details */}
        <div 
          className="p-6 md:p-8 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <h3 className="text-xl font-semibold text-white mb-4">Hardware Details</h3>
          <p className="text-white/70">{planData.hardwareModel}</p>
        </div>

        {/* Actions */}
        {planData.status === 'active' && (
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/dashboard/mining"
              className="flex-1 py-4 rounded-full font-semibold text-center transition-all"
              style={{
                background: 'linear-gradient(135deg, #582dff, #3a137a)',
                color: '#ffffff',
                boxShadow: '0 4px 24px rgba(88, 45, 255, 0.4)',
              }}
            >
              View Mining Dashboard →
            </Link>
            {pendingUpgrade ? (
              <div
                className="flex-1 py-4 rounded-full font-semibold text-center"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  opacity: 0.6,
                }}
              >
                Upgrade Pending
              </div>
            ) : (
              <Link
                href="/dashboard/plans"
                className="flex-1 py-4 rounded-full font-semibold text-center transition-all"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                }}
              >
                Upgrade Plan
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
