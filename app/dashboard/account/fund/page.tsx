import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import AccountFundPageClient from '@/components/dashboard/AccountFundPageClient'
import { getAccountBalanceEntries, getAccountBalanceSummary } from '@/lib/account-balance'

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

  const [summary, entries] = await Promise.all([
    getAccountBalanceSummary(user.id),
    getAccountBalanceEntries(user.id, { limit: 120 }),
  ])

  return (
    <AccountFundPageClient
      balanceUsd={summary.balanceUsd}
      pendingCreditsUsd={summary.pendingCreditsUsd}
      entries={entries.map(entry => ({
        ...entry,
        createdAt: entry.createdAt.toISOString(),
      }))}
    />
  )
}
