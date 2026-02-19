import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import AccountWithdrawPageClient from '@/components/dashboard/AccountWithdrawPageClient'
import {
  getAccountBalanceAssetSummary,
  getAccountBalanceEntries,
  getAccountBalanceSummary,
} from '@/lib/account-balance'
import { getTrackedCryptoPricesUsd, TRACKED_ASSET_COINS } from '@/lib/crypto-prices'
import { getLatestSolWalletAddress } from '@/lib/wallet-addresses'

export const dynamic = 'force-dynamic'

export default async function WithdrawAccountPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      id: true,
      btcWalletAddress: true,
      ethWalletAddress: true,
      walletAddress: true,
      kycProfile: {
        select: { status: true },
      },
    },
  })

  if (!user) {
    redirect('/sign-in')
  }

  const prices = await getTrackedCryptoPricesUsd()
  const [summary, entries, assetSummary, miningReady, tradingReady, referralReady] = await Promise.all([
    getAccountBalanceSummary(user.id),
    getAccountBalanceEntries(user.id, { limit: 800 }),
    getAccountBalanceAssetSummary(user.id, prices),
    prisma.earnings.aggregate({
      where: {
        userId: user.id,
        isActive: true,
        isWithdrawable: true,
        userPlan: { status: 'completed' },
      },
      _sum: { totalEarnedUsd: true },
    }),
    prisma.tradingEarning.aggregate({
      where: {
        userId: user.id,
        isActive: true,
        tradingUserPlan: { status: 'completed' },
      },
      _sum: { totalEarnedUsd: true },
    }),
    prisma.referralBonus.aggregate({
      where: {
        referrerId: user.id,
        status: 'available',
      },
      _sum: { amountUsd: true },
    }),
  ])
  const solAddress = await getLatestSolWalletAddress(user.id)

  const latestEntriesByReference = entries.reduce<Map<string, (typeof entries)[number]>>((map, entry) => {
    const key = `${entry.source}:${entry.direction}:${entry.referenceId}`
    const existing = map.get(key)
    if (!existing || existing.createdAt.getTime() < entry.createdAt.getTime()) {
      map.set(key, entry)
    }
    return map
  }, new Map())

  const latestEntries = [...latestEntriesByReference.values()]
  const totalWithdrawnUsd = latestEntries
    .filter(
      entry =>
        entry.direction === 'debit' &&
        entry.status === 'settled' &&
        entry.source === 'account_balance_withdrawal'
    )
    .reduce((sum, entry) => sum + entry.amountUsd, 0)

  const withdrawalEntries = entries
    .filter(entry => entry.source === 'account_balance_withdrawal')
    .map(entry => ({
      ...entry,
      createdAt: entry.createdAt.toISOString(),
    }))

  const walletOptions = [
    user.btcWalletAddress ? { coinType: 'BTC', address: user.btcWalletAddress } : null,
    user.ethWalletAddress ? { coinType: 'ETH', address: user.ethWalletAddress } : null,
    solAddress ? { coinType: 'SOL', address: solAddress } : null,
    user.walletAddress ? { coinType: 'USDT', address: user.walletAddress } : null,
  ].filter(
    (
      option
    ): option is {
      coinType: 'BTC' | 'ETH' | 'SOL' | 'USDT'
      address: string
    } => Boolean(option)
  )

  return (
    <AccountWithdrawPageClient
      spendableBalanceUsd={summary.availableToSpendUsd}
      withdrawableEarningsUsd={summary.withdrawableEarningsUsd}
      pendingCreditsUsd={summary.pendingCreditsUsd}
      pendingDebitsUsd={summary.pendingDebitsUsd}
      pendingWithdrawalsUsd={summary.pendingWithdrawalsUsd}
      walletFlow={TRACKED_ASSET_COINS.map(coinType => assetSummary.byCoin[coinType])}
      totalWithdrawnUsd={totalWithdrawnUsd}
      totalDepositedUsd={summary.totalDepositedUsd}
      totalInvestedUsd={summary.totalInvestedUsd}
      totalEarnedUsd={summary.earnedCreditsUsd}
      miningReadyUsd={Number(miningReady._sum.totalEarnedUsd ?? 0)}
      tradingReadyUsd={Number(tradingReady._sum.totalEarnedUsd ?? 0)}
      referralReadyUsd={Number(referralReady._sum.amountUsd ?? 0)}
      walletOptions={walletOptions}
      entries={withdrawalEntries}
      kycStatus={user.kycProfile?.status ?? 'not_submitted'}
    />
  )
}
