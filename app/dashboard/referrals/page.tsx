import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import ReferralDashboard from '@/components/dashboard/ReferralDashboard'

const DEFAULT_REFERRAL_SETTINGS = {
  bonusPercent: 5,
  minWithdrawalUsd: 50,
}

export default async function ReferralsPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      referrals: {
        select: {
          id: true,
          fullName: true,
          email: true,
          accountStatus: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      referralBonuses: {
        orderBy: { createdAt: 'desc' },
        include: {
          referee: {
            select: { fullName: true, email: true },
          },
        },
      },
      referralWithdrawals: {
        orderBy: { requestedAt: 'desc' },
      },
    },
  })

  if (!user) {
    redirect('/sign-in')
  }

  const settings = await prisma.referralSettings.findFirst()
  const bonusPercent = settings ? Number(settings.bonusPercent) : DEFAULT_REFERRAL_SETTINGS.bonusPercent
  const minWithdrawalUsd = settings
    ? Number(settings.minWithdrawalUsd)
    : DEFAULT_REFERRAL_SETTINGS.minWithdrawalUsd

  const totalBonusUsd = user.referralBonuses
    .filter(bonus => bonus.status !== 'revoked')
    .reduce((sum, bonus) => sum + Number(bonus.amountUsd), 0)

  const committedUsd = user.referralWithdrawals
    .filter(item => item.status !== 'rejected')
    .reduce((sum, item) => sum + Number(item.amountUsd), 0)

  const pendingUsd = user.referralWithdrawals
    .filter(item => item.status === 'pending')
    .reduce((sum, item) => sum + Number(item.amountUsd), 0)

  const availableUsd = Math.max(0, totalBonusUsd - committedUsd)
  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-6">
      <ReferralDashboard
        referralCode={user.referralCode || ''}
        bonusPercent={bonusPercent}
        totalBonusUsd={totalBonusUsd}
        availableUsd={availableUsd}
        pendingUsd={pendingUsd}
        minWithdrawalUsd={minWithdrawalUsd}
        referrals={user.referrals.map(ref => ({
          id: ref.id,
          fullName: ref.fullName,
          email: ref.email,
          accountStatus: ref.accountStatus,
          createdAt: ref.createdAt.toISOString(),
        }))}
        bonuses={user.referralBonuses.map(bonus => ({
          id: bonus.id,
          amountUsd: Number(bonus.amountUsd),
          createdAt: bonus.createdAt.toISOString(),
          status: bonus.status,
          refereeName: bonus.referee.fullName || bonus.referee.email,
        }))}
        withdrawals={user.referralWithdrawals.map(item => ({
          id: item.id,
          amountUsd: Number(item.amountUsd),
          status: item.status,
          requestedAt: item.requestedAt.toISOString(),
          coinType: item.coinType,
        }))}
      />
    </div>
  )
}
