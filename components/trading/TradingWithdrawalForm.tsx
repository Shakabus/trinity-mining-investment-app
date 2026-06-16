'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LoadingButton from '@/components/ui/LoadingButton'
import { useToast } from '@/components/ui/ToastProvider'
import { useCurrency } from '@/components/currency/CurrencyProvider'

interface TradingWithdrawalFormProps {
  availableUsd: number
  minWithdrawalUsd: number
}

export default function TradingWithdrawalForm({ availableUsd, minWithdrawalUsd }: TradingWithdrawalFormProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const { currency, rates, format, convert } = useCurrency()
  const rate = rates[currency] || 1
  const toUsd = (value: number) => (rate ? value / rate : value)
  const [amountUsd, setAmountUsd] = useState(convert(minWithdrawalUsd))
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    const amountInput = Number(amountUsd)
    const amountUsdValue = toUsd(amountInput)
    if (amountUsdValue < minWithdrawalUsd) {
      showToast(`Minimum withdrawal is ${format(minWithdrawalUsd)}`, 'error')
      return
    }
    if (amountUsdValue > availableUsd) {
      showToast('Amount exceeds available balance.', 'error')
      return
    }
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/user/trading/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountUsd: amountUsdValue }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        showToast(data?.error || 'Unable to submit withdrawal.', 'error')
      } else {
        showToast('Withdrawal to account balance submitted for review.', 'success')
        setAmountUsd(convert(minWithdrawalUsd))
        router.refresh()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="p-6 rounded-3xl space-y-4"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
      }}
    >
      <div className="text-white font-semibold text-lg">Request Trading Withdrawal</div>
      <div className="text-xs text-white/60">Available: {format(availableUsd)}</div>

      <div>
        <label className="text-xs text-white/60">Amount ({currency})</label>
        <input
          type="number"
          value={amountUsd}
          min={convert(minWithdrawalUsd)}
          max={convert(availableUsd)}
          onChange={event => setAmountUsd(Number(event.target.value))}
          className="w-full mt-2 px-3 py-2 rounded-lg text-sm"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
          }}
        />
      </div>

      <div className="text-xs text-white/60">
        Destination: Account Balance (review required)
      </div>

      <LoadingButton
        onClick={handleSubmit}
        isLoading={isSubmitting}
        loadingText="Submitting..."
        className="w-full px-4 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-[1.01]"
        style={{
          background: 'linear-gradient(135deg, #582dff, #3a137a)',
          color: '#ffffff',
        }}
      >
        Withdraw to Account Balance
      </LoadingButton>
    </div>
  )
}
