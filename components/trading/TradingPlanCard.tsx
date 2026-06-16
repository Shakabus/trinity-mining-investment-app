'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, Clock, TrendingUp } from 'lucide-react'
import LoadingButton from '@/components/ui/LoadingButton'
import { useToast } from '@/components/ui/ToastProvider'
import { useCurrency } from '@/components/currency/CurrencyProvider'

interface TradingPlanCardProps {
  plan: {
    id: number
    name: string
    minInvestmentUsd: number
    maxInvestmentUsd: number
    minDurationHours: number
    maxDurationHours: number
    minReturnMultiplier: number
    maxReturnMultiplier: number
  }
}

export default function TradingPlanCard({ plan }: TradingPlanCardProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const { currency, rates, format, convert } = useCurrency()
  const rate = rates[currency] || 1
  const toUsd = (value: number) => (rate ? value / rate : value)
  const minAmount = convert(plan.minInvestmentUsd)
  const maxAmount = convert(plan.maxInvestmentUsd)
  const [amount, setAmount] = useState(minAmount)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const investmentUsd = Math.max(0, Number(toUsd(amount).toFixed(2)))
      const response = await fetch('/api/user/trading/select-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, investmentUsd }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        showToast(data?.error || 'Unable to start trading plan.', 'error')
      } else {
        showToast('Payment instructions ready. Submit proof to activate.', 'success')
        router.push('/dashboard/investment-trading/payment')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const amountUsd = toUsd(amount)
  const minReturn = plan.minReturnMultiplier * amountUsd
  const maxReturn = plan.maxReturnMultiplier * amountUsd

  return (
    <div
      className="p-6 rounded-3xl space-y-4"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.03))',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-white font-semibold text-xl">{plan.name}</div>
          <div className="text-white/60 text-sm">
            {format(plan.minInvestmentUsd)} - {format(plan.maxInvestmentUsd)}
          </div>
        </div>
        <div
          className="px-3 py-1 rounded-full text-xs"
          style={{
            background: 'rgba(88, 45, 255, 0.2)',
            border: '1px solid rgba(88,45,255,0.4)',
            color: '#c4b5fd',
          }}
        >
          Trading
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-white/70">
        <div className="flex items-center gap-2">
          <Clock size={14} />
          {plan.minDurationHours}-{plan.maxDurationHours} hours window
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp size={14} />
          {plan.minReturnMultiplier.toFixed(2)}x - {plan.maxReturnMultiplier.toFixed(2)}x
        </div>
      </div>

      <div>
        <label className="text-xs text-white/60">Investment amount ({currency})</label>
        <input
          type="number"
          min={minAmount}
          max={maxAmount}
          value={amount}
          onChange={event => setAmount(Number(event.target.value))}
          className="w-full mt-2 px-3 py-2 rounded-lg text-sm"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
          }}
        />
      </div>

      <div className="text-xs text-white/60">
        Expected payout range:{' '}
        <span className="text-white font-semibold">
          {format(minReturn)} - {format(maxReturn)}
        </span>
      </div>

      <LoadingButton
        onClick={handleSubmit}
        isLoading={isSubmitting}
        loadingText="Preparing..."
        className="w-full px-4 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
        style={{
          background: 'linear-gradient(135deg, #582dff, #3a137a)',
          color: '#ffffff',
        }}
      >
        Proceed to Payment
        <ArrowUpRight size={16} />
      </LoadingButton>
    </div>
  )
}
