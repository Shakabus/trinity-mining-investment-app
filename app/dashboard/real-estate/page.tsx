import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Building2, LineChart, Wallet } from 'lucide-react'
import RealEstatePropertySpotlight from '@/components/marketing/RealEstatePropertySpotlight'
import { getRealEstateDashboardData } from '@/lib/real-estate-dashboard'
import { getRealEstatePropertySpotlightItems } from '@/lib/real-estate-property-spotlight'
import { isPaymentReminderVisible } from '@/lib/payment-reminder'

export const dynamic = 'force-dynamic'

export default async function RealEstatePortfolioDashboardPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const data = await getRealEstateDashboardData(userId)
  const spotlightProperties = await getRealEstatePropertySpotlightItems()
  const hasPendingBuyIn = !data.canCreateNewBuyIn
  const latestPendingBuyInAt = data.positions
    .filter(position => position.status === 'submitted' || position.status === 'under_review')
    .map(position => new Date(position.submittedAt))
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null
  const showPendingBuyInReminder = hasPendingBuyIn && isPaymentReminderVisible(latestPendingBuyInAt)
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Real estate Portfolio</h1>
        <p className="text-white/70 max-w-3xl">
          Browse the full list of managed real estate assets and review each participation lane,
          payout basis, and buy-in structure before entering your property flow.
        </p>
      </div>

      {showPendingBuyInReminder && (
        <div
          className="rounded-2xl p-4 text-sm text-white/85"
          style={{
            background: 'rgba(250, 204, 21, 0.14)',
            border: '1px solid rgba(250, 204, 21, 0.35)',
          }}
        >
          You already have a real-estate buy-in pending verification. One buy-in must be approved
          before you can submit the next property or tier allocation.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/dashboard/real-estate/my-properties"
          className="rounded-2xl p-4 transition-all hover:-translate-y-0.5"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))',
            border: '1px solid rgba(255,255,255,0.18)',
          }}
        >
          <div className="flex items-center gap-3 text-white">
            <Building2 size={18} />
            <span className="font-semibold">My Properties</span>
          </div>
          <p className="text-white/65 text-sm mt-2">Track owned allocations and active asset cycles.</p>
        </Link>

        <Link
          href="/dashboard/real-estate/property-earnings"
          className="rounded-2xl p-4 transition-all hover:-translate-y-0.5"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))',
            border: '1px solid rgba(255,255,255,0.18)',
          }}
        >
          <div className="flex items-center gap-3 text-white">
            <LineChart size={18} />
            <span className="font-semibold">Property Earnings</span>
          </div>
          <p className="text-white/65 text-sm mt-2">See income summaries and cycle-level performance.</p>
        </Link>

        <Link
          href="/dashboard/real-estate/withdrawals"
          className="rounded-2xl p-4 transition-all hover:-translate-y-0.5"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))',
            border: '1px solid rgba(255,255,255,0.18)',
          }}
        >
          <div className="flex items-center gap-3 text-white">
            <Wallet size={18} />
            <span className="font-semibold">Withdrawals</span>
          </div>
          <p className="text-white/65 text-sm mt-2">Request payouts from completed property cycles.</p>
        </Link>
      </div>

      <RealEstatePropertySpotlight
        buyInLabel="Buy In"
        enableBuyInFlow
        properties={spotlightProperties}
      />
    </div>
  )
}
