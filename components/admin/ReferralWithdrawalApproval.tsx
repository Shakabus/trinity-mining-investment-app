'use client'

import { useState } from 'react'
import LoadingButton from '@/components/ui/LoadingButton'

interface ReferralWithdrawalApprovalProps {
  withdrawal: {
    id: number
    userId: number
    userName: string
    userEmail: string
    amountUsd: number
    coinType: string
    walletAddress: string
    status: string
    requestedAt: string
    transactionId: string | null
  }
}

export default function ReferralWithdrawalApproval({ withdrawal }: ReferralWithdrawalApprovalProps) {
  const [status, setStatus] = useState(withdrawal.status)
  const [txid, setTxid] = useState(withdrawal.transactionId || '')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleUpdate = async () => {
    setIsSaving(true)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/referral-withdrawals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: withdrawal.id,
          status,
          transactionId: txid,
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Failed to update referral withdrawal.')
      }
      setMessage('Updated.')
    } catch (error: any) {
      setMessage(error?.message || 'Failed to update.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="text-white font-semibold">{withdrawal.userName}</div>
          <div className="text-xs text-white/50">{withdrawal.userEmail}</div>
        </div>
        <div className="text-sm text-white/80">
          ${withdrawal.amountUsd.toFixed(2)} in {withdrawal.coinType}
        </div>
      </div>

      <div className="text-xs text-white/50 break-all">Destination: {withdrawal.walletAddress || 'Account Balance'}</div>

      <div className="flex flex-col md:flex-row gap-3">
        <select
          value={status}
          onChange={event => setStatus(event.target.value)}
          className="px-3 py-2 rounded-lg text-sm"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
          }}
        >
          <option value="pending" style={{ color: '#000000' }}>
            pending
          </option>
          <option value="approved" style={{ color: '#000000' }}>
            approved
          </option>
          <option value="processed" style={{ color: '#000000' }}>
            processed
          </option>
          <option value="rejected" style={{ color: '#000000' }}>
            rejected
          </option>
        </select>
        <input
          value={txid}
          onChange={event => setTxid(event.target.value)}
          placeholder="Transaction ID (optional)"
          className="flex-1 px-3 py-2 rounded-lg text-sm"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
          }}
        />
        <LoadingButton
          onClick={handleUpdate}
          isLoading={isSaving}
          loadingText="Saving..."
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #582dff, #3a137a)', color: '#ffffff' }}
        >
          Update
        </LoadingButton>
      </div>

      {message && <div className="text-xs text-white/60">{message}</div>}
    </div>
  )
}
