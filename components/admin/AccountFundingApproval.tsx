'use client'

import { useState } from 'react'
import LoadingButton from '@/components/ui/LoadingButton'

type FundingRequest = {
  requestId: string
  userName: string
  userEmail: string
  amountUsd: number
  coinType: string | null
  txid: string | null
  proofUrl: string | null
  createdAt: string
}

export default function AccountFundingApproval({ request }: { request: FundingRequest }) {
  const [isBusy, setIsBusy] = useState(false)
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<'idle' | 'approved' | 'rejected' | 'error'>('idle')

  const review = async (decision: 'approve' | 'reject') => {
    try {
      setIsBusy(true)
      const response = await fetch('/api/admin/account-balance/funding-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: request.requestId,
          decision,
          note,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Failed to review funding request.')
      }

      setStatus(decision === 'approve' ? 'approved' : 'rejected')
    } catch (error) {
      console.error('Funding request review error:', error)
      setStatus('error')
    } finally {
      setIsBusy(false)
    }
  }

  if (status === 'approved' || status === 'rejected') {
    return (
      <div
        className="p-5 rounded-2xl"
        style={{
          background:
            status === 'approved'
              ? 'rgba(16, 185, 129, 0.14)'
              : 'rgba(239, 68, 68, 0.14)',
          border:
            status === 'approved'
              ? '1px solid rgba(16, 185, 129, 0.35)'
              : '1px solid rgba(239, 68, 68, 0.35)',
        }}
      >
        <div className="text-white font-semibold">
          {status === 'approved' ? 'Funding request approved.' : 'Funding request rejected.'}
        </div>
      </div>
    )
  }

  return (
    <div
      className="p-5 rounded-2xl space-y-4"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
        border: '1px solid rgba(255, 255, 255, 0.18)',
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-white font-semibold">{request.userName}</div>
          <div className="text-xs text-white/65">{request.userEmail}</div>
        </div>
        <div className="text-right">
          <div className="text-emerald-300 font-semibold">${request.amountUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="text-xs text-white/65">{request.coinType || 'N/A'}</div>
        </div>
      </div>

      <div className="text-xs text-white/70 space-y-1">
        <div>TXID: {request.txid || '-'}</div>
        <div>Submitted: {new Date(request.createdAt).toLocaleString()}</div>
      </div>

      {request.proofUrl && (
        <a
          href={request.proofUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-sm text-blue-300 underline underline-offset-4"
        >
          View payment proof
        </a>
      )}

      <textarea
        value={note}
        onChange={event => setNote(event.target.value)}
        placeholder="Optional note"
        className="w-full min-h-20 rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-white/35"
      />

      {status === 'error' && <div className="text-sm text-red-300">Request review failed. Try again.</div>}

      <div className="flex flex-wrap gap-3">
        <LoadingButton
          onClick={() => review('approve')}
          isLoading={isBusy}
          loadingText="Saving..."
          className="px-4 py-2 rounded-full text-sm font-semibold"
          style={{
            background: 'linear-gradient(135deg, #10b981, #047857)',
            color: '#ffffff',
          }}
        >
          Approve
        </LoadingButton>
        <LoadingButton
          onClick={() => review('reject')}
          isLoading={isBusy}
          loadingText="Saving..."
          className="px-4 py-2 rounded-full text-sm font-semibold"
          style={{
            background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
            color: '#ffffff',
          }}
        >
          Reject
        </LoadingButton>
      </div>
    </div>
  )
}
