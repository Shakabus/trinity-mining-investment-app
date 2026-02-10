import Link from 'next/link'
import { Building2, CalendarClock, ChevronRight, CircleDollarSign, LandPlot, Percent } from 'lucide-react'
import { realEstatePositions } from '@/components/real-estate/realEstatePortfolioData'

const statusStyle: Record<string, { bg: string; border: string; color: string; label: string }> = {
  active: {
    bg: 'rgba(56, 189, 248, 0.16)',
    border: '1px solid rgba(56, 189, 248, 0.35)',
    color: '#7dd3fc',
    label: 'Active',
  },
  maturing: {
    bg: 'rgba(250, 204, 21, 0.16)',
    border: '1px solid rgba(250, 204, 21, 0.35)',
    color: '#fde047',
    label: 'Maturing',
  },
  completed: {
    bg: 'rgba(34, 197, 94, 0.16)',
    border: '1px solid rgba(34, 197, 94, 0.35)',
    color: '#86efac',
    label: 'Completed',
  },
}

const totalAllocation = realEstatePositions.reduce((sum, item) => sum + item.allocationUsd, 0)
const totalEarned = realEstatePositions.reduce((sum, item) => sum + item.totalEarnedUsd, 0)
const avgMonthlyYield = realEstatePositions.reduce((sum, item) => sum + item.monthlyYieldPct, 0) / realEstatePositions.length
const nextPayout = [...realEstatePositions]
  .sort((a, b) => +new Date(a.nextPayoutAt) - +new Date(b.nextPayoutAt))[0]
  ?.nextPayoutAt

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function RealEstateMyPropertiesPanel() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.18)' }}>
          <div className="flex items-center gap-2 text-white/70 text-sm"><LandPlot size={16} /> Total Allocation</div>
          <div className="text-white text-2xl font-semibold mt-2">{formatUsd(totalAllocation)}</div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.18)' }}>
          <div className="flex items-center gap-2 text-white/70 text-sm"><CircleDollarSign size={16} /> Total Earned</div>
          <div className="text-white text-2xl font-semibold mt-2">{formatUsd(totalEarned)}</div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.18)' }}>
          <div className="flex items-center gap-2 text-white/70 text-sm"><Percent size={16} /> Avg Monthly Yield</div>
          <div className="text-white text-2xl font-semibold mt-2">{avgMonthlyYield.toFixed(2)}%</div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.18)' }}>
          <div className="flex items-center gap-2 text-white/70 text-sm"><CalendarClock size={16} /> Next Payout</div>
          <div className="text-white text-2xl font-semibold mt-2">{nextPayout ? formatDate(nextPayout) : 'Not Scheduled'}</div>
        </div>
      </div>

      <div className="rounded-3xl p-6 md:p-7" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.18)' }}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 text-white">
            <Building2 size={18} />
            <h2 className="text-xl font-semibold">Allocation Inventory</h2>
          </div>
          <Link
            href="/dashboard/real-estate"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #582dff, #3a137a)' }}
          >
            Add New Allocation
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left">
            <thead>
              <tr className="text-xs uppercase tracking-[0.08em] text-white/55">
                <th className="pb-3 pr-4">Property</th>
                <th className="pb-3 pr-4">Tier</th>
                <th className="pb-3 pr-4">Allocation</th>
                <th className="pb-3 pr-4">Earned</th>
                <th className="pb-3 pr-4">Yield / Month</th>
                <th className="pb-3 pr-4">Occupancy</th>
                <th className="pb-3 pr-4">Cycle Progress</th>
                <th className="pb-3 pr-4">Next Payout</th>
                <th className="pb-3 pr-0">Status</th>
              </tr>
            </thead>
            <tbody>
              {realEstatePositions.map(position => {
                const status = statusStyle[position.status]
                return (
                  <tr key={position.id} className="border-t border-white/10">
                    <td className="py-4 pr-4">
                      <div className="text-white font-medium">{position.property}</div>
                      <div className="text-white/60 text-sm">{position.location}</div>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="text-white/90">{position.tier}</div>
                      <div className="text-white/55 text-xs mt-1">{position.category}</div>
                    </td>
                    <td className="py-4 pr-4 text-white">{formatUsd(position.allocationUsd)}</td>
                    <td className="py-4 pr-4 text-white">{formatUsd(position.totalEarnedUsd)}</td>
                    <td className="py-4 pr-4 text-white">{position.monthlyYieldPct.toFixed(2)}%</td>
                    <td className="py-4 pr-4 text-white">{position.occupancyPct}%</td>
                    <td className="py-4 pr-4">
                      <div className="w-36 h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${position.cycleProgressPct}%`, background: 'linear-gradient(90deg, #582dff, #7c3aed)' }}
                        />
                      </div>
                      <div className="text-white/60 text-xs mt-1">{position.cycleProgressPct}% complete</div>
                    </td>
                    <td className="py-4 pr-4 text-white">{formatDate(position.nextPayoutAt)}</td>
                    <td className="py-4 pr-0">
                      <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: status.bg, border: status.border, color: status.color }}>
                        {status.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

