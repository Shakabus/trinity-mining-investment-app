import { prisma } from '@/lib/db'
import { getRealEstateDashboardData } from '@/lib/real-estate-dashboard'

const toUsd = (value: unknown) => {
  const numberValue = Number(value ?? 0)
  if (!Number.isFinite(numberValue)) return 0
  return Number(numberValue.toFixed(2))
}

export type TransferReadySummary = {
  miningReadyUsd: number
  tradingReadyUsd: number
  referralReadyUsd: number
  realEstateReadyUsd: number
  totalReadyUsd: number
}

export async function getUserTransferReadySummary(args: {
  userId: number
  clerkUserId: string
}): Promise<TransferReadySummary> {
  const { userId, clerkUserId } = args

  const [
    miningEarned,
    miningCommitted,
    tradingEarned,
    tradingCommitted,
    referralEarned,
    referralCommitted,
    realEstateDashboard,
  ] = await Promise.all([
    prisma.earnings.aggregate({
      where: {
        userId,
        isActive: true,
        isWithdrawable: true,
        userPlan: { status: 'completed' },
      },
      _sum: { totalEarnedUsd: true },
    }),
    prisma.withdrawal.aggregate({
      where: {
        userId,
        status: { not: 'rejected' },
      },
      _sum: { amountUsd: true },
    }),
    prisma.tradingEarning.aggregate({
      where: {
        userId,
        isActive: true,
        tradingUserPlan: { status: 'completed' },
      },
      _sum: { totalEarnedUsd: true },
    }),
    prisma.tradingWithdrawal.aggregate({
      where: {
        userId,
        status: { not: 'rejected' },
        tradingUserPlan: { status: 'completed' },
      },
      _sum: { amountUsd: true },
    }),
    prisma.referralBonus.aggregate({
      where: {
        referrerId: userId,
        status: { not: 'revoked' },
      },
      _sum: { amountUsd: true },
    }),
    prisma.referralWithdrawal.aggregate({
      where: {
        userId,
        status: { not: 'rejected' },
      },
      _sum: { amountUsd: true },
    }),
    getRealEstateDashboardData(clerkUserId),
  ])

  const miningReadyUsd = Math.max(
    0,
    toUsd(miningEarned._sum.totalEarnedUsd) - toUsd(miningCommitted._sum.amountUsd)
  )
  const tradingReadyUsd = Math.max(
    0,
    toUsd(tradingEarned._sum.totalEarnedUsd) - toUsd(tradingCommitted._sum.amountUsd)
  )
  const referralReadyUsd = Math.max(
    0,
    toUsd(referralEarned._sum.amountUsd) - toUsd(referralCommitted._sum.amountUsd)
  )
  const realEstateReadyUsd = Math.max(0, toUsd(realEstateDashboard.availableWithdrawalUsd))

  return {
    miningReadyUsd: toUsd(miningReadyUsd),
    tradingReadyUsd: toUsd(tradingReadyUsd),
    referralReadyUsd: toUsd(referralReadyUsd),
    realEstateReadyUsd: toUsd(realEstateReadyUsd),
    totalReadyUsd: toUsd(miningReadyUsd + tradingReadyUsd + referralReadyUsd + realEstateReadyUsd),
  }
}

