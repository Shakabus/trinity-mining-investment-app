'use client'

import { useState } from 'react'
import PlanModal from './PlanModal'
import { useCurrency } from '@/components/currency/CurrencyProvider'

interface PlanCardProps {
  plan: {
    id: number
    name: string
    slug: string
    updatedAt: string
    basePrice: number
    coinType: string
    baseHashrate: number
    hashrateUnit: string
    algorithm: string
    hardwareModel: string
    features: {
      featureText: string
    }[]
    durationOptions: {
      id: number
      durationDays: number
      durationLabel: string
      priceMultiplier: number
      isDefault: boolean
      finalPrice: number
      upgradeCredit: number
      upgradePrice: number
      isEligible: boolean
      isExtension: boolean
    }[]
    primaryDurationLabel: string
    isUpgradeMode?: boolean
  }
}

export default function PlanCard({ plan }: PlanCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { format } = useCurrency()

  const basePrice = plan.basePrice
  const isUpgradeMode = Boolean(plan.isUpgradeMode)
  const hashrate = plan.baseHashrate
  const hasEligibleOption = plan.durationOptions.some(option => option.isEligible)
  const formattedUpdatedAt = new Date(plan.updatedAt).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <>
      <div
        onClick={() => (hasEligibleOption ? setIsModalOpen(true) : null)}
        className={`p-5 md:p-6 rounded-3xl transition-all min-h-[420px] flex flex-col group ${
          hasEligibleOption ? 'cursor-pointer hover:scale-[1.02]' : 'opacity-60 cursor-not-allowed'
        }`}
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              background: 'rgba(88, 45, 255, 0.2)',
              border: '1px solid rgba(88, 45, 255, 0.3)',
              color: '#a78bfa',
            }}
          >
            {plan.coinType}
          </span>
          {plan.slug.includes('vip') || plan.slug.includes('elite') ? <span className="text-xl">*</span> : null}
        </div>

        <h3 className="text-xl md:text-2xl font-bold text-white mb-2">{plan.name}</h3>

        <p className="text-sm text-white/60 mb-2">
          {hashrate.toLocaleString()} {plan.hashrateUnit} - {plan.algorithm}
        </p>
        <p className="text-xs text-white/55 mb-4">Cycle: {plan.primaryDurationLabel}</p>

        <div className="mb-6">
          <div className="text-3xl md:text-4xl font-bold text-white">{format(basePrice)}</div>
          <div className="text-xs text-white/50 mt-1">
            {isUpgradeMode ? 'Upgrade starting price' : 'Starting price'}
          </div>
        </div>

        <ul className="space-y-2 flex-grow mb-6">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-white/80 text-sm">
              <span className="text-green-400 mt-0.5 flex-shrink-0">-</span>
              <span>{feature.featureText}</span>
            </li>
          ))}
        </ul>

        <div className="text-[11px] text-white/45 mb-3">Last updated: {formattedUpdatedAt}</div>

        <button
          className="w-full py-3 rounded-full font-semibold transition-all group-hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, #582dff, #3a137a)',
            color: '#ffffff',
            boxShadow: '0 4px 16px rgba(88, 45, 255, 0.3)',
          }}
          disabled={!hasEligibleOption}
        >
          {isUpgradeMode ? 'Upgrade Plan ->' : 'Select Plan ->'}
        </button>
      </div>

      {isModalOpen && (
        <PlanModal plan={{ ...plan, isUpgradeMode }} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      )}
    </>
  )
}
