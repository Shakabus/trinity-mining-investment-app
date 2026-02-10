import { CalendarClock, CircleDollarSign, LineChart, TrendingUp } from 'lucide-react'
import { realEstatePayoutEvents, realEstatePositions } from '@/components/real-estate/realEstatePortfolioData'

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const paidEvents = realEstatePayoutEvents.filter(item => item.status === 'paid')
const scheduledEvents = realEstatePayoutEvents.filter(item => item.status === 'scheduled')
const totalPaid = paidEvents.reduce((sum, item) => sum + item.netUsd, 0)
const upcomingNet = scheduledEvents.reduce((sum, item) => sum + item.netUsd, 0)
const monthlyRunRate = realEstatePositions.reduce(
  (sum, item) => sum + (item.allocationUsd * item.monthlyYieldPct) / 100,
  0,
)
const avgYield = realEstatePositions.reduce((sum, item) => sum + item.monthlyYieldPct, 0) / realEstatePositions.length

const laneBreakdown = [
  { label: 'Hotels', value: realEstatePositions.filter(item => item.category === 'Hotel').length },
  { label: 'Resorts', value: realEstatePositions.filter(item => item.category === 'Resort').length },
  { label: 'Urban', value: realEstatePositions.filter(item => item.category === 'Urban').length },
  { label: 'Mixed', value: realEstatePositions.filter(item => item.category === 'Mixed').length },
]

export default function RealEstateEarningsPanel() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.18)' }}>
          <div className="flex items-center gap-2 text-white/70 text-sm"><CircleDollarSign size={16} /> Realized Earnings</div>
          <div className="text-white text-2xl font-semibold mt-2">{formatUsd(totalPaid)}</div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.18)' }}>
          <div className="flex items-center gap-2 text-white/70 text-sm"><TrendingUp size={16} /> Monthly Run Rate</div>
          <div className="text-white text-2xl font-semibold mt-2">{formatUsd(monthlyRunRate)}</div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.18)' }}>
          <div className="flex items-center gap-2 text-white/70 text-sm"><LineChart size={16} /> Avg Yield / Month</div>
          <div className="text-white text-2xl font-semibold mt-2">{avgYield.toFixed(2)}%</div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.18)' }}>
          <div className="flex items-center gap-2 text-white/70 text-sm"><CalendarClock size={16} /> Next Payouts (Net)</div>
          <div className="text-white text-2xl font-semibold mt-2">{formatUsd(upcomingNet)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-3xl p-6" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.18)' }}>
          <h2 className="text-white text-xl font-semibold mb-4">Earnings Ledger</h2>
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left">
              <thead>
                <tr className="text-xs uppercase tracking-[0.08em] text-white/55">
                  <th className="pb-3 pr-4">Property</th>
                  <th className="pb-3 pr-4">Period</th>
                  <th className="pb-3 pr-4">Gross</th>
                  <th className="pb-3 pr-4">Fees</th>
                  <th className="pb-3 pr-4">Net</th>
                  <th className="pb-3 pr-4">Payout Date</th>
                  <th className="pb-3 pr-0">Status</th>
                </tr>
              </thead>
              <tbody>
                {realEstatePayoutEvents.map(item => (
                  <tr key={item.id} className="border-t border-white/10">
                    <td className="py-4 pr-4 text-white">{item.property}</td>
                    <td className="py-4 pr-4 text-white/80">{item.periodLabel}</td>
                    <td className="py-4 pr-4 text-white">{formatUsd(item.grossUsd)}</td>
                    <td className="py-4 pr-4 text-white/80">{formatUsd(item.feesUsd)}</td>
                    <td className="py-4 pr-4 text-white font-semibold">{formatUsd(item.netUsd)}</td>
                    <td className="py-4 pr-4 text-white/80">{formatDate(item.payoutDate)}</td>
                    <td className="py-4 pr-0">
                      <span
                        className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={
                          item.status === 'paid'
                            ? { background: 'rgba(34, 197, 94, 0.16)', border: '1px solid rgba(34, 197, 94, 0.35)', color: '#86efac' }
                            : { background: 'rgba(250, 204, 21, 0.16)', border: '1px solid rgba(250, 204, 21, 0.35)', color: '#fde047' }
                        }
                      >
                        {item.status === 'paid' ? 'Paid' : 'Scheduled'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl p-6 space-y-4" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.18)' }}>
          <h2 className="text-white text-xl font-semibold">Lane Mix</h2>
          {laneBreakdown.map(item => {
            const total = realEstatePositions.length || 1
            const pct = (item.value / total) * 100
            return (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm text-white/80 mb-1">
                  <span>{item.label}</span>
                  <span>{item.value} lanes ({pct.toFixed(0)}%)</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #582dff, #7c3aed)' }} />
                </div>
              </div>
            )
          })}
          <div className="pt-3 border-t border-white/10 text-sm text-white/70 leading-6">
            Payout windows are grouped by property cycle date, net of operational and settlement fees.
            Use this panel to monitor realized performance versus projected yield bands.
          </div>
        </div>
      </div>
    </div>
  )
}

