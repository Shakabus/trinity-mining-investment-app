import Link from 'next/link'
import { Building2, CalendarClock, ChevronRight, CircleDollarSign, LandPlot } from 'lucide-react'
import type { RealEstatePosition } from '@/lib/real-estate-dashboard'

const statusStyle: Record<string, { bg: string; border: string; color: string; label: string }> = {
  submitted: {
    bg: 'rgba(250, 204, 21, 0.16)',
    border: '1px solid rgba(250, 204, 21, 0.35)',
    color: '#fde047',
    label: 'Submitted',
  },
  under_review: {
    bg: 'rgba(56, 189, 248, 0.16)',
    border: '1px solid rgba(56, 189, 248, 0.35)',
    color: '#7dd3fc',
    label: 'Under Review',
  },
  approved: {
    bg: 'rgba(34, 197, 94, 0.16)',
    border: '1px solid rgba(34, 197, 94, 0.35)',
    color: '#86efac',
    label: 'Approved',
  },
}

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function RealEstateMyPropertiesPanel({ positions }: { positions: RealEstatePosition[] }) {
  const totalAllocation = positions.reduce((sum, item) => sum + item.allocationUsd, 0)
  const approvedCount = positions.filter(item => item.status === 'approved').length
  const pendingCount = positions.filter(item => item.status !== 'approved').length
  const latestSubmission = positions[0]?.submittedAt

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.18)' }}>
          <div className="flex items-center gap-2 text-white/70 text-sm"><LandPlot size={16} /> Total Allocation</div>
          <div className="text-white text-2xl font-semibold mt-2">{formatUsd(totalAllocation)}</div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.18)' }}>
          <div className="flex items-center gap-2 text-white/70 text-sm"><CircleDollarSign size={16} /> Approved Lanes</div>
          <div className="text-white text-2xl font-semibold mt-2">{approvedCount}</div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.18)' }}>
          <div className="flex items-center gap-2 text-white/70 text-sm"><Building2 size={16} /> Pending Verification</div>
          <div className="text-white text-2xl font-semibold mt-2">{pendingCount}</div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.18)' }}>
          <div className="flex items-center gap-2 text-white/70 text-sm"><CalendarClock size={16} /> Latest Submission</div>
          <div className="text-white text-2xl font-semibold mt-2">{latestSubmission ? formatDate(latestSubmission) : 'None Yet'}</div>
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

        {positions.length === 0 ? (
          <div className="text-white/65 text-sm border border-white/10 rounded-2xl p-4 bg-white/[0.03]">
            No real-estate buy-in submissions found for this account yet. Submit a property tier payment proof first.
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full text-left">
            <thead>
              <tr className="text-xs uppercase tracking-[0.08em] text-white/55">
                <th className="pb-3 pr-4">Property</th>
                <th className="pb-3 pr-4">Tier</th>
                <th className="pb-3 pr-4">Allocation</th>
                <th className="pb-3 pr-4">Monthly Income</th>
                <th className="pb-3 pr-4">Duration</th>
                <th className="pb-3 pr-4">Projected Band</th>
                <th className="pb-3 pr-4">Coin</th>
                <th className="pb-3 pr-4">TXID</th>
                <th className="pb-3 pr-4">Submitted</th>
                <th className="pb-3 pr-0">Status</th>
              </tr>
            </thead>
            <tbody>
              {positions.map(position => {
                const status = statusStyle[position.status]
                return (
                  <tr key={position.id} className="border-t border-white/10">
                    <td className="py-4 pr-4">
                      <div className="text-white font-medium">{position.property}</div>
                      <div className="text-white/60 text-sm">{position.location}</div>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="text-white/90">{position.tier}</div>
                    </td>
                    <td className="py-4 pr-4 text-white">{formatUsd(position.allocationUsd)}</td>
                    <td className="py-4 pr-4 text-white">{formatUsd(position.monthlyIncomeUsd)}</td>
                    <td className="py-4 pr-4 text-white/90">{position.duration}</td>
                    <td className="py-4 pr-4 text-white/90">{position.projectedBand}</td>
                    <td className="py-4 pr-4 text-white/90">{position.coinType}</td>
                    <td className="py-4 pr-4 text-white/90 font-mono text-xs">{position.txid}</td>
                    <td className="py-4 pr-4 text-white">{formatDate(position.submittedAt)}</td>
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
        )}
      </div>
    </div>
  )
}
