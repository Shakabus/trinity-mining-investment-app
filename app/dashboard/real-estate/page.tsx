import Link from 'next/link'
import { Building2, LineChart, Wallet } from 'lucide-react'
import RealEstatePropertySpotlight from '@/components/marketing/RealEstatePropertySpotlight'

export default function RealEstatePortfolioDashboardPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Real estate Portfolio</h1>
        <p className="text-white/70 max-w-3xl">
          Browse the full list of managed real estate assets and review each participation lane,
          payout basis, and buy-in structure before entering your property flow.
        </p>
      </div>

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

      <RealEstatePropertySpotlight buyInLabel="Buy In" />
    </div>
  )
}

