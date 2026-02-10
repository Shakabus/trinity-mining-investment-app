import { Wallet, ShieldCheck, BanknoteArrowDown } from 'lucide-react'
import RealEstateWithdrawalsPanel from '@/components/real-estate/RealEstateWithdrawalsPanel'

export default function RealEstateWithdrawalsPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Real Estate Withdrawals</h1>
        <p className="text-white/70 max-w-3xl">
          Withdrawals from completed real estate cycles will appear here once your portfolio
          allocations begin generating distributable earnings.
        </p>
      </div>

      <div
        className="rounded-3xl p-6 space-y-4"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))',
          border: '1px solid rgba(255,255,255,0.18)',
        }}
      >
        <div className="flex items-center gap-3 text-white">
          <Wallet size={18} />
          <h2 className="text-xl font-semibold">No available withdrawals yet</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white/70">
          <div className="flex items-start gap-2">
            <ShieldCheck size={16} className="mt-0.5 text-white/80" />
            <p>Completed cycle verification is required before funds become withdrawable.</p>
          </div>
          <div className="flex items-start gap-2">
            <BanknoteArrowDown size={16} className="mt-0.5 text-white/80" />
            <p>Once active, this page will show payout history and withdrawal status tracking.</p>
          </div>
        </div>
      </div>

      <RealEstateWithdrawalsPanel />
    </div>
  )
}
