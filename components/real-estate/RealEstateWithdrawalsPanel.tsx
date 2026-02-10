import Link from 'next/link'
import { BanknoteArrowDown, Clock3, ShieldCheck, Wallet } from 'lucide-react'
import { realEstateAvailableWithdrawalUsd, realEstateWithdrawals } from '@/components/real-estate/realEstatePortfolioData'

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const statusStyle: Record<string, { bg: string; border: string; color: string; label: string }> = {
  pending: {
    bg: 'rgba(250, 204, 21, 0.16)',
    border: '1px solid rgba(250, 204, 21, 0.35)',
    color: '#fde047',
    label: 'Pending',
  },
  processing: {
    bg: 'rgba(56, 189, 248, 0.16)',
    border: '1px solid rgba(56, 189, 248, 0.35)',
    color: '#7dd3fc',
    label: 'Processing',
  },
  paid: {
    bg: 'rgba(34, 197, 94, 0.16)',
    border: '1px solid rgba(34, 197, 94, 0.35)',
    color: '#86efac',
    label: 'Paid',
  },
  rejected: {
    bg: 'rgba(248, 113, 113, 0.16)',
    border: '1px solid rgba(248, 113, 113, 0.35)',
    color: '#fca5a5',
    label: 'Rejected',
  },
}

export default function RealEstateWithdrawalsPanel() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-3xl p-6 md:p-7" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.18)' }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-white/70 text-sm"><Wallet size={16} /> Available to Withdraw</div>
              <div className="text-white text-3xl font-semibold mt-2">{formatUsd(realEstateAvailableWithdrawalUsd)}</div>
              <p className="text-white/60 text-sm mt-2">Funds become withdrawable after cycle close, verification, and settlement window clearance.</p>
            </div>
            <button
              type="button"
              className="px-5 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={realEstateAvailableWithdrawalUsd <= 0}
              style={{ background: 'linear-gradient(135deg, #582dff, #3a137a)' }}
            >
              Request Withdrawal
            </button>
          </div>
        </div>

        <div className="rounded-3xl p-6 space-y-3" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.18)' }}>
          <div className="flex items-start gap-2 text-white/80 text-sm">
            <ShieldCheck size={16} className="mt-0.5" />
            <p>KYC and wallet verification must be completed for payout release.</p>
          </div>
          <div className="flex items-start gap-2 text-white/80 text-sm">
            <Clock3 size={16} className="mt-0.5" />
            <p>Normal processing window: 12 to 48 hours after approval.</p>
          </div>
          <div className="flex items-start gap-2 text-white/80 text-sm">
            <BanknoteArrowDown size={16} className="mt-0.5" />
            <p>Network fees vary by selected payout method at the point of execution.</p>
          </div>
          <Link href="/dashboard/support" className="inline-block text-sm text-white underline underline-offset-4 mt-1">
            Need a custom payout channel?
          </Link>
        </div>
      </div>

      <div className="rounded-3xl p-6 md:p-7" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.18)' }}>
        <h2 className="text-white text-xl font-semibold mb-4">Withdrawal History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-[820px] w-full text-left">
            <thead>
              <tr className="text-xs uppercase tracking-[0.08em] text-white/55">
                <th className="pb-3 pr-4">Reference</th>
                <th className="pb-3 pr-4">Requested</th>
                <th className="pb-3 pr-4">Amount</th>
                <th className="pb-3 pr-4">Method</th>
                <th className="pb-3 pr-4">Destination</th>
                <th className="pb-3 pr-0">Status</th>
              </tr>
            </thead>
            <tbody>
              {realEstateWithdrawals.map(item => {
                const status = statusStyle[item.status]
                return (
                  <tr key={item.id} className="border-t border-white/10">
                    <td className="py-4 pr-4 text-white font-medium">{item.reference}</td>
                    <td className="py-4 pr-4 text-white/80">{formatDate(item.requestedAt)}</td>
                    <td className="py-4 pr-4 text-white">{formatUsd(item.amountUsd)}</td>
                    <td className="py-4 pr-4 text-white/80">{item.method}</td>
                    <td className="py-4 pr-4 text-white/70">{item.destination}</td>
                    <td className="py-4 pr-0">
                      <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: status.bg, border: status.border, color: status.color }}>
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

