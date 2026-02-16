'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LoadingButton from '@/components/ui/LoadingButton'
import { useToast } from '@/components/ui/ToastProvider'

type ReviewableSource =
  | 'funding_deposit'
  | 'mining_plan_purchase'
  | 'trading_plan_purchase'
  | 'real_estate_buy_in'
  | 'account_balance_withdrawal'

export type AccountBalanceOperationRow = {
  source: ReviewableSource
  referenceId: string
  userName: string
  userEmail: string
  amountUsd: number
  createdAt: string
  coinType: string | null
  amountCrypto: number | null
  subtitle: string
}

const sourceLabel: Record<ReviewableSource, string> = {
  funding_deposit: 'Account Deposit',
  mining_plan_purchase: 'Mining Plan Payment',
  trading_plan_purchase: 'Trading Plan Payment',
  real_estate_buy_in: 'Real-Estate Buy-In',
  account_balance_withdrawal: 'Account Withdrawal',
}

export default function AccountBalanceOperationApproval({
  operation,
}: {
  operation: AccountBalanceOperationRow
}) {
  const router = useRouter()
  const { showToast } = useToast()
  const [isBusy, setIsBusy] = useState(false)
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<'idle' | 'approved' | 'rejected' | 'error'>('idle')

  const review = async (decision: 'approve' | 'reject') => {
    try {
      setIsBusy(true)
      const response = await fetch('/api/admin/account-balance/operations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: operation.source,
          referenceId: operation.referenceId,
          decision,
          note,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Failed to review request.')
      }

      setStatus(decision === 'approve' ? 'approved' : 'rejected')
      showToast(
        decision === 'approve'
          ? 'Operation approved successfully.'
          : 'Operation rejected successfully.',
        'success'
      )
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to review request.'
      setStatus('error')
      showToast(message, 'error')
    } finally {
      setIsBusy(false)
    }
  }

  if (status === 'approved' || status === 'rejected') {
    return (
      <div
        className="p-5 rounded-2xl"
        style={{
          background: status === 'approved' ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)',
          border: status === 'approved' ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(239, 68, 68, 0.35)',
        }}
      >
        <div className="text-white font-semibold">
          {status === 'approved' ? 'Operation approved.' : 'Operation rejected.'}
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
          <div className="text-xs text-white/65 uppercase tracking-wide">{sourceLabel[operation.source]}</div>
          <div className="text-white font-semibold">{operation.userName}</div>
          <div className="text-xs text-white/65">{operation.userEmail}</div>
        </div>
        <div className="text-right">
          <div className="text-emerald-300 font-semibold">
            ${operation.amountUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-white/65">
            {operation.coinType ?? 'N/A'}
            {operation.amountCrypto ? ` (${operation.amountCrypto.toFixed(8)})` : ''}
          </div>
        </div>
      </div>

      <div className="text-xs text-white/70 space-y-1">
        <div>{operation.subtitle}</div>
        <div>Reference: {operation.referenceId}</div>
        <div>Submitted: {new Date(operation.createdAt).toLocaleString()}</div>
      </div>

      <textarea
        value={note}
        onChange={event => setNote(event.target.value)}
        placeholder="Optional note"
        className="w-full min-h-20 rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-white/35"
      />

      {status === 'error' && (
        <div className="text-sm text-rose-300">Request review failed. Check log and retry.</div>
      )}

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
