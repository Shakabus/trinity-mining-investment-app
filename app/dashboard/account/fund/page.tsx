import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import AccountFundPageClient from '@/components/dashboard/AccountFundPageClient'
import {
  getAccountBalanceAssetSummary,
  getAccountBalanceEntries,
  getAccountBalanceSummary,
} from '@/lib/account-balance'
import { getTrackedCryptoPricesUsd, TRACKED_ASSET_COINS } from '@/lib/crypto-prices'

export const dynamic = 'force-dynamic'

export default async function FundAccountPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: { id: true },
  })

  if (!user) {
    redirect('/sign-in')
  }

  const prices = await getTrackedCryptoPricesUsd()
  const [summary, entries, assetSummary] = await Promise.all([
    getAccountBalanceSummary(user.id),
    getAccountBalanceEntries(user.id, { limit: 120 }),
    getAccountBalanceAssetSummary(user.id, prices),
  ])

  return (
    <AccountFundPageClient
      balanceUsd={summary.availableToSpendUsd}
      pendingCreditsUsd={summary.pendingCreditsUsd}
      pendingDebitsUsd={summary.pendingDebitsUsd}
      walletFlow={TRACKED_ASSET_COINS.map(coinType => assetSummary.byCoin[coinType])}
      entries={entries.map(entry => ({
        ...entry,
        createdAt: entry.createdAt.toISOString(),
      }))}
    />
  )
}
