import { DollarSign, TrendingUp, CalendarClock } from 'lucide-react'
import RealEstateEarningsPanel from '@/components/real-estate/RealEstateEarningsPanel'

export default function RealEstatePropertyEarningsPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Property Earnings</h1>
        <p className="text-white/70 max-w-3xl">
          Track cycle-level earnings from your real estate allocations with monthly and total views.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))',
            border: '1px solid rgba(255,255,255,0.18)',
          }}
        >
          <div className="flex items-center gap-2 text-white/70 text-sm">
            <DollarSign size={16} />
            <span>Total Earned</span>
          </div>
          <div className="text-white text-2xl font-semibold mt-2">$0.00</div>
        </div>
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))',
            border: '1px solid rgba(255,255,255,0.18)',
          }}
        >
          <div className="flex items-center gap-2 text-white/70 text-sm">
            <TrendingUp size={16} />
            <span>Current Monthly Run Rate</span>
          </div>
          <div className="text-white text-2xl font-semibold mt-2">$0.00</div>
        </div>
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))',
            border: '1px solid rgba(255,255,255,0.18)',
          }}
        >
          <div className="flex items-center gap-2 text-white/70 text-sm">
            <CalendarClock size={16} />
            <span>Next Payout Window</span>
          </div>
          <div className="text-white text-2xl font-semibold mt-2">Not Scheduled</div>
        </div>
      </div>

      <RealEstateEarningsPanel />
    </div>
  )
}
