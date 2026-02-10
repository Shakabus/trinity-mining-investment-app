import { CalendarClock, CircleDollarSign, LineChart, TrendingUp } from 'lucide-react'
import type {
  RealEstateEarningsSummary,
  RealEstatePayoutEvent,
} from '@/lib/real-estate-dashboard'

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

type RealEstateEarningsPanelProps = {
  payouts: RealEstatePayoutEvent[]
  summary: RealEstateEarningsSummary
}

export default function RealEstateEarningsPanel({ payouts, summary }: RealEstateEarningsPanelProps) {
  const approved = summary.approvedCount
  const pending = summary.pendingCount

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.18)' }}>
          <div className="flex items-center gap-2 text-white/70 text-sm"><CircleDollarSign size={16} /> Realized Earnings</div>
          <div className="text-white text-2xl font-semibold mt-2">{formatUsd(summary.totalRealizedUsd)}</div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.18)' }}>
          <div className="flex items-center gap-2 text-white/70 text-sm"><TrendingUp size={16} /> Monthly Run Rate</div>
          <div className="text-white text-2xl font-semibold mt-2">{formatUsd(summary.monthlyRunRateUsd)}</div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.18)' }}>
          <div className="flex items-center gap-2 text-white/70 text-sm"><LineChart size={16} /> Avg Yield / Month</div>
          <div className="text-white text-2xl font-semibold mt-2">{summary.avgYieldPerMonthPct.toFixed(2)}%</div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.18)' }}>
          <div className="flex items-center gap-2 text-white/70 text-sm"><CalendarClock size={16} /> Next Payout (Net)</div>
          <div className="text-white text-2xl font-semibold mt-2">{formatUsd(summary.nextPayoutNetUsd)}</div>
          <div className="text-white/60 text-xs mt-2">
            {summary.nextPayoutDate
              ? `${formatDate(summary.nextPayoutDate)}${summary.nextPayoutProperty ? ` - ${summary.nextPayoutProperty}` : ''}`
              : 'No scheduled payout yet'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-3xl p-6" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.18)' }}>
          <h2 className="text-white text-xl font-semibold mb-4">Earnings Ledger</h2>
          {payouts.length === 0 ? (
            <div className="text-white/65 text-sm border border-white/10 rounded-2xl p-4 bg-white/[0.03]">
              No realized real-estate payout entries yet. Earnings will appear after allocations are approved and complete their first payout cycle.
            </div>
          ) : (
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
                {payouts.map(item => (
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
          )}
        </div>

        <div className="rounded-3xl p-6 space-y-4" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.18)' }}>
          <h2 className="text-white text-xl font-semibold">Earnings Readiness</h2>
          <div className="text-sm text-white/80">
            Approved allocations: <span className="text-white font-semibold">{approved}</span>
          </div>
          <div className="text-sm text-white/80">
            Pending verification: <span className="text-white font-semibold">{pending}</span>
          </div>
          <div className="text-sm text-white/80">
            Current monthly run rate: <span className="text-white font-semibold">{formatUsd(summary.monthlyRunRateUsd)}</span>
          </div>
          <div className="text-sm text-white/80">
            Upcoming payouts queued: <span className="text-white font-semibold">{formatUsd(summary.upcomingPayoutsNetUsd)}</span>
          </div>
          <div className="pt-3 border-t border-white/10 text-sm text-white/70 leading-6">
            This panel is user-specific. It only reflects payouts recorded against your own
            approved real-estate allocations and updates automatically from your approved buy-ins.
          </div>
        </div>
      </div>
    </div>
  )
}
