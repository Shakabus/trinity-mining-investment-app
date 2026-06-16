'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Clock3, X } from 'lucide-react'
import LoadingButton from '@/components/ui/LoadingButton'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/ToastProvider'

interface RealEstateWithdrawalApprovalProps {
  withdrawal: {
    ticketId: number
    userName: string
    userEmail: string
    reference: string
    requestedAt: string
    amountUsd: number
    method: string
    destination: string
    status: 'open' | 'waiting' | 'closed' | 'rejected'
  }
}

function statusLabel(status: 'open' | 'waiting' | 'closed' | 'rejected') {
  if (status === 'closed') return 'Approved / Paid'
  if (status === 'waiting') return 'Processing'
  if (status === 'rejected') return 'Rejected'
  return 'Pending'
}

export default function RealEstateWithdrawalApproval({ withdrawal }: RealEstateWithdrawalApprovalProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [isBusy, setIsBusy] = useState(false)
  const [confirmApprove, setConfirmApprove] = useState(false)
  const [confirmReject, setConfirmReject] = useState(false)

  const handleStatusUpdate = async (status: 'closed' | 'rejected') => {
    setIsBusy(true)
    try {
      const response = await fetch('/api/admin/support/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: withdrawal.ticketId,
          status,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        showToast(data?.error || 'Failed to update real-estate withdrawal.', 'error')
        return
      }

      showToast(status === 'closed' ? 'Real-estate withdrawal approved.' : 'Real-estate withdrawal rejected.', 'success')
      router.refresh()
    } catch (error) {
      console.error('Real-estate withdrawal status update error:', error)
      showToast('Network error while updating withdrawal status.', 'error')
    } finally {
      setIsBusy(false)
    }
  }

  const requestedAtLabel = new Date(withdrawal.requestedAt).toLocaleString()

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
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 pt-1">
            <div>
              <div className="text-white/50 text-xs">Reference</div>
              <div className="text-white text-sm">{withdrawal.reference}</div>
            </div>
            <div>
              <div className="text-white/50 text-xs">Amount</div>
              <div className="text-white text-sm">${withdrawal.amountUsd.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-white/50 text-xs">Method</div>
              <div className="text-white text-sm">{withdrawal.method || '-'}</div>
            </div>
          </div>
          <div className="text-xs text-white/60 break-all">Destination: {withdrawal.destination || '-'}</div>
          <div className="flex items-center gap-2 text-xs text-white/45">
            <Clock3 size={14} />
            <span>Requested: {requestedAtLabel}</span>
            <span>|</span>
            <span>{statusLabel(withdrawal.status)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <LoadingButton
            onClick={() => setConfirmApprove(true)}
            isLoading={isBusy}
            loadingText="Saving..."
            className="px-4 py-2 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
            }}
          >
            <Check size={16} />
            Approve
          </LoadingButton>

          <LoadingButton
            onClick={() => setConfirmReject(true)}
            isLoading={isBusy}
            loadingText="Saving..."
            className="px-4 py-2 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: '#ffffff',
            }}
          >
            <X size={16} />
            Reject
          </LoadingButton>
        </div>
      </div>

      <ConfirmDialog
        open={confirmApprove}
        title="Approve real-estate withdrawal?"
        description={`Approve ${withdrawal.reference} for ${withdrawal.userName || withdrawal.userEmail}?`}
        confirmLabel="Approve"
        isBusy={isBusy}
        onConfirm={async () => {
          setConfirmApprove(false)
          await handleStatusUpdate('closed')
        }}
        onCancel={() => setConfirmApprove(false)}
      />

      <ConfirmDialog
        open={confirmReject}
        title="Reject real-estate withdrawal?"
        description={`Reject ${withdrawal.reference} for ${withdrawal.userName || withdrawal.userEmail}?`}
        confirmLabel="Reject"
        isDanger
        isBusy={isBusy}
        onConfirm={async () => {
          setConfirmReject(false)
          await handleStatusUpdate('rejected')
        }}
        onCancel={() => setConfirmReject(false)}
      />
    </div>
  )
}


