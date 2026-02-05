'use client'

import { useState, useEffect, useMemo } from 'react'
import LoadingButton from '@/components/ui/LoadingButton'
import { useToast } from '@/components/ui/ToastProvider'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCurrency } from '@/components/currency/CurrencyProvider'

interface PlanModalProps {
  plan: {
    id: number
    name: string
    basePrice: number
    coinType: string
    baseHashrate: number
    hashrateUnit: string
    algorithm: string
    hardwareModel: string
    isUpgradeMode: boolean
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
  }
  isOpen: boolean
  onClose: () => void
}

export default function PlanModal({ plan, isOpen, onClose }: PlanModalProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const { currency, format } = useCurrency()
  const eligibleOptions = useMemo(
    () => plan.durationOptions.filter(option => option.isEligible),
    [plan.durationOptions]
  )
  const initialOption =
    eligibleOptions.find(option => option.isDefault) || eligibleOptions[0] || plan.durationOptions[0]
  const [selectedDuration, setSelectedDuration] = useState(initialOption)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const basePrice = plan.basePrice
  const multiplier = selectedDuration.priceMultiplier
  const finalPrice = selectedDuration.finalPrice
  const upgradeCredit = selectedDuration.upgradeCredit
  const upgradePrice = selectedDuration.upgradePrice
  const displayPrice = plan.isUpgradeMode ? upgradePrice : finalPrice
  const hasEligibleOption = eligibleOptions.length > 0

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    if (selectedDuration && !selectedDuration.isEligible && eligibleOptions.length > 0) {
      setSelectedDuration(eligibleOptions[0])
    }
  }, [eligibleOptions, selectedDuration])

  const handleSelectPlan = async () => {
    if (!hasEligibleOption) return
    setIsSubmitting(true)

    try {
      const response = await fetch(plan.isUpgradeMode ? '/api/user/upgrade-plan' : '/api/user/select-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          durationDays: selectedDuration.durationDays,
          finalPrice: finalPrice,
        }),
      })

      if (response.ok) {
        router.push('/dashboard/payment')
        router.refresh()
      } else {
        const data = await response.json().catch(() => null)
        showToast(data?.error || 'Error selecting plan. Please try again.', 'error')
      }
    } catch (error) {
      console.error('Error:', error)
      showToast('Error selecting plan. Please try again.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl my-8 rounded-3xl p-6 md:p-8 relative max-h-[90vh] overflow-y-auto"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05))',
          backdropFilter: 'blur(28px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors">
          <X size={24} className="text-white" />
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl md:text-3xl font-bold text-white">{plan.name}</h2>
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
          </div>
          <p className="text-white/70">
            {plan.baseHashrate} {plan.hashrateUnit} - {plan.algorithm}
          </p>
        </div>

        {!hasEligibleOption && plan.isUpgradeMode && (
          <div
            className="p-4 rounded-xl mb-6 text-sm"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fecaca',
            }}
          >
            No valid upgrade options available for this plan at the moment.
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-white/80 mb-3">Select Duration</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {plan.durationOptions.map((option) => {
              const isSelected = selectedDuration.id === option.id
              const priceLabel = plan.isUpgradeMode ? option.upgradePrice : option.finalPrice

              return (
                <button
                  key={option.id}
                  onClick={() => option.isEligible && setSelectedDuration(option)}
                  disabled={!option.isEligible}
                  className="p-4 rounded-xl transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(88, 45, 255, 0.3), rgba(58, 19, 122, 0.2))'
                      : 'rgba(255, 255, 255, 0.05)',
                    border: isSelected ? '2px solid rgba(88, 45, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <div className="text-white font-semibold text-sm mb-1">{option.durationLabel}</div>
                  <div className="text-white/60 text-xs">{format(priceLabel)}</div>
                  {plan.isUpgradeMode && !option.isExtension && option.upgradeCredit > 0 && (
                    <div className="text-xs text-emerald-300 mt-1">
                      Credit: {format(option.upgradeCredit)}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div
          className="p-6 rounded-2xl mb-6"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
          }}
        >
          <div className="flex justify-between items-center mb-4">
            <span className="text-white/70">Base Price:</span>
            <span className="text-white font-semibold">{format(basePrice)}</span>
          </div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-white/70">Duration:</span>
            <span className="text-white font-semibold">{selectedDuration.durationLabel}</span>
          </div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-white/70">Multiplier:</span>
            <span className="text-white font-semibold">x{multiplier}</span>
          </div>
          {plan.isUpgradeMode && !selectedDuration.isExtension && upgradeCredit > 0 && (
            <div className="flex justify-between items-center mb-4">
              <span className="text-emerald-300">Upgrade Credit:</span>
              <span className="text-emerald-200 font-semibold">-{format(upgradeCredit)}</span>
            </div>
          )}
          <div className="border-t border-white/10 pt-4 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-white text-lg font-semibold">Total Price:</span>
              <span className="text-3xl font-bold text-white">{format(displayPrice)}</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-white font-semibold mb-2">Hardware Details</h3>
          <p className="text-white/70 text-sm">{plan.hardwareModel}</p>
        </div>

        <LoadingButton
          onClick={handleSelectPlan}
          isLoading={isSubmitting}
          loadingText="Processing..."
          disabled={!hasEligibleOption || !selectedDuration.isEligible}
          className="w-full py-4 rounded-full font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, #582dff, #3a137a)',
            color: '#ffffff',
            boxShadow: '0 4px 24px rgba(88, 45, 255, 0.4)',
          }}
        >
          {`Select ${plan.name} - ${format(displayPrice)}`}
        </LoadingButton>

        <p className="text-center text-xs text-white/50 mt-4">
          You will be redirected to payment instructions after selection
        </p>
      </div>
    </div>
  )
}
