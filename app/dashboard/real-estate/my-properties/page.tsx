import Link from 'next/link'
import { Building2, ArrowRight } from 'lucide-react'
import RealEstateMyPropertiesPanel from '@/components/real-estate/RealEstateMyPropertiesPanel'

export default function RealEstateMyPropertiesPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">My Properties</h1>
        <p className="text-white/70 max-w-3xl">
          Active and completed property allocations will appear here as your portfolio grows.
        </p>
      </div>

      <div
        className="rounded-3xl p-8"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))',
          border: '1px solid rgba(255,255,255,0.18)',
        }}
      >
        <div className="flex items-center gap-3 text-white">
          <Building2 size={18} />
          <h2 className="text-xl font-semibold">No property allocations yet</h2>
        </div>
        <p className="text-white/70 mt-3 max-w-2xl">
          Start from the portfolio listing page to select a property lane and enter your
          buy-in flow. Once activated, allocations and cycle status will be tracked here.
        </p>
        <Link
          href="/dashboard/real-estate"
          className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{
            background: 'linear-gradient(135deg, #582dff, #3a137a)',
          }}
        >
          Explore Properties
          <ArrowRight size={14} />
        </Link>
      </div>

      <RealEstateMyPropertiesPanel />
    </div>
  )
}
