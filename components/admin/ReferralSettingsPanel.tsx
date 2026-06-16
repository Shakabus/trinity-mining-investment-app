'use client'

import { useState } from 'react'
import LoadingButton from '@/components/ui/LoadingButton'

interface ReferralSettingsPanelProps {
  isEnabled: boolean
  bonusPercent: number
  minPaymentUsd: number
  minWithdrawalUsd: number
}

export default function ReferralSettingsPanel({
  isEnabled,
  bonusPercent,
  minPaymentUsd,
  minWithdrawalUsd,
}: ReferralSettingsPanelProps) {
  const [enabled, setEnabled] = useState(isEnabled)
  const [percent, setPercent] = useState(bonusPercent.toFixed(2))
  const [minPayment, setMinPayment] = useState(minPaymentUsd.toFixed(2))
  const [minWithdrawal, setMinWithdrawal] = useState(minWithdrawalUsd.toFixed(2))
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    setStatus(null)
    try {
      const response = await fetch('/api/admin/referrals/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isEnabled: enabled,
          bonusPercent: Number(percent),
          minPaymentUsd: Number(minPayment),
          minWithdrawalUsd: Number(minWithdrawal),
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Failed to update referral settings.')
      }
      setStatus({ type: 'success', message: 'Referral settings updated.' })
    } catch (error: any) {
      setStatus({ type: 'error', message: error?.message || 'Failed to update referral settings.' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="p-6 rounded-3xl"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold text-lg">Referral Settings</h2>
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={enabled}
            onChange={event => setEnabled(event.target.checked)}
          />
          Enabled
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-white/60 mb-1">Bonus Percent</label>
          <input
            type="number"
            value={percent}
            onChange={event => setPercent(event.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
            }}
          />
        </div>
        <div>
          <label className="block text-xs text-white/60 mb-1">Min Payment (USD)</label>
          <input
            type="number"
            value={minPayment}
            onChange={event => setMinPayment(event.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
            }}
          />
        </div>
        <div>
          <label className="block text-xs text-white/60 mb-1">Min Referral Withdrawal (USD)</label>
          <input
            type="number"
            value={minWithdrawal}
            onChange={event => setMinWithdrawal(event.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
            }}
          />
        </div>
      </div>

      {status && (
        <div
          className="px-3 py-2 rounded-lg text-xs mt-4"
          style={{
            background: status.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: status.type === 'success' ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(239,68,68,0.4)',
            color: status.type === 'success' ? '#6ee7b7' : '#fecaca',
          }}
        >
          {status.message}
        </div>
      )}

      <LoadingButton
        onClick={handleSave}
        isLoading={isSaving}
        loadingText="Saving..."
        className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          background: 'linear-gradient(135deg, #582dff, #3a137a)',
          color: '#ffffff',
        }}
      >
        Save Settings
      </LoadingButton>
    </div>
  )
}
