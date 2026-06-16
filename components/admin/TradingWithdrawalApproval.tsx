'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LoadingButton from '@/components/ui/LoadingButton'
import { useToast } from '@/components/ui/ToastProvider'

interface TradingWithdrawalApprovalProps {
  withdrawal: {
    id: number
    userName: string
    userEmail: string
    amountUsd: number
    walletAddress: string
    status: string
    requestedAt: string
    transactionId: string | null
  }
}

const STATUS_OPTIONS = ['pending', 'approved', 'processed', 'rejected']

export default function TradingWithdrawalApproval({ withdrawal }: TradingWithdrawalApprovalProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [status, setStatus] = useState(withdrawal.status)
  const [txid, setTxid] = useState(withdrawal.transactionId || '')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleUpdate = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch('/api/admin/trading/withdrawals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          withdrawalId: withdrawal.id,
          status,
          transactionId: txid || null,
        }),
      })

      if (!response.ok) {
        showToast('Failed to update trading withdrawal.', 'error')
      } else {
        showToast('Trading withdrawal updated.', 'success')
        router.refresh()
      }
    } finally {
      setIsProcessing(false)
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="text-white font-semibold">{withdrawal.userName || withdrawal.userEmail}</div>
          <div className="text-white/60 text-sm">{withdrawal.userEmail}</div>
          <div className="text-white/70 text-sm">
            ${withdrawal.amountUsd.toFixed(2)} (Trading)
          </div>
          <div className="text-xs text-white/50">Destination: {withdrawal.walletAddress || 'Account Balance'}</div>
          <div className="text-xs text-white/40">Requested: {new Date(withdrawal.requestedAt).toLocaleString()}</div>
        </div>

        <div className="flex flex-col gap-3 min-w-[240px]">
          <select
            value={status}
            onChange={event => setStatus(event.target.value)}
            className="px-4 py-2 rounded-lg text-sm"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
            }}
          >
            {STATUS_OPTIONS.map(option => (
              <option key={option} value={option} style={{ color: '#000000' }}>
                {option.toUpperCase()}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={txid}
            onChange={event => setTxid(event.target.value)}
            placeholder="Transaction ID (optional)"
            className="px-4 py-2 rounded-lg text-sm font-mono"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
            }}
          />

          <LoadingButton
            onClick={handleUpdate}
            isLoading={isProcessing}
            loadingText="Saving..."
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
            }}
          >
            Save
          </LoadingButton>
        </div>
      </div>
    </div>
  )
}
