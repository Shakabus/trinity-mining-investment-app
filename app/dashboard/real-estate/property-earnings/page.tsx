import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import RealEstateEarningsPanel from '@/components/real-estate/RealEstateEarningsPanel'
import { getRealEstateDashboardData } from '@/lib/real-estate-dashboard'

export const dynamic = 'force-dynamic'

export default async function RealEstatePropertyEarningsPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const { positions, payouts, summary } = await getRealEstateDashboardData(userId)
  const hasPositions = positions.length > 0

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Property Earnings</h1>
        <p className="text-white/70 max-w-3xl">
          Track cycle-level earnings from your real estate allocations with monthly and total views.
        </p>
      </div>

      {!hasPositions && (
        <div
          className="rounded-3xl p-6 md:p-7"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))',
            border: '1px solid rgba(255,255,255,0.18)',
          }}
        >
          <h2 className="text-xl font-semibold text-white">No active allocation yet</h2>
          <p className="text-white/70 mt-3 max-w-2xl">
            Earnings are generated from your approved real-estate allocations. Submit your first
            buy-in proof to activate this ledger.
          </p>
          <Link
            href="/dashboard/real-estate"
            className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #582dff, #3a137a)' }}
          >
            Start Buy-In Flow
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      <RealEstateEarningsPanel payouts={payouts} summary={summary} />
    </div>
  )
}
