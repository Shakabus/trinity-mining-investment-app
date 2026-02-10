import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import RealEstateWithdrawalsPanel from '@/components/real-estate/RealEstateWithdrawalsPanel'
import { getRealEstateDashboardData } from '@/lib/real-estate-dashboard'

export const dynamic = 'force-dynamic'

export default async function RealEstateWithdrawalsPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const { availableWithdrawalUsd, withdrawals } = await getRealEstateDashboardData(userId)

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Real Estate Withdrawals</h1>
        <p className="text-white/70 max-w-3xl">
          Withdrawals from completed real estate cycles will appear here once your portfolio
          allocations begin generating distributable earnings.
        </p>
      </div>

      <RealEstateWithdrawalsPanel
        availableWithdrawalUsd={availableWithdrawalUsd}
        withdrawals={withdrawals}
      />
    </div>
  )
}
