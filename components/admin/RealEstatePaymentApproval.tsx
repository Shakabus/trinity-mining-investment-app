'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Clock, X } from 'lucide-react'
import LoadingButton from '@/components/ui/LoadingButton'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/ToastProvider'

interface RealEstatePaymentApprovalProps {
  payment: {
    ticketId: number
    userName: string
    userEmail: string
    property: string
    location: string
    tier: string
    minimum: string
    duration: string
    projectedBand: string
    coinType: string
    txid: string
    createdAt: Date
    status: 'open' | 'waiting' | 'closed' | 'rejected'
    proof?: {
      paymentProofUrl: string | null
      attachmentName: string | null
      createdAt: Date
    } | null
  }
}

const statusLabel = (status: 'open' | 'waiting' | 'closed' | 'rejected') => {
  if (status === 'closed') return 'Approved'
  if (status === 'waiting') return 'Under Review'
  if (status === 'rejected') return 'Rejected'
  return 'Submitted'
}

export default function RealEstatePaymentApproval({ payment }: RealEstatePaymentApprovalProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [confirmApprove, setConfirmApprove] = useState(false)
  const [confirmReject, setConfirmReject] = useState(false)

  const handleStatusUpdate = async (status: 'closed' | 'rejected') => {
    setIsProcessing(true)
    try {
      const response = await fetch('/api/admin/support/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: payment.ticketId,
          status,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        showToast(data?.error || 'Failed to update real-estate payment status.', 'error')
        return
      }

      showToast(
        status === 'closed'
          ? 'Real-estate buy-in approved.'
          : 'Real-estate buy-in rejected.',
        'success',
      )
      router.refresh()
    } catch (error) {
      console.error('Real-estate payment status update error:', error)
      showToast('Network error while updating payment status.', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const timeAgo = () => {
    const now = new Date()
    const created = new Date(payment.createdAt)
    const diffMs = now.getTime() - created.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    if (diffMins > 0) return `${diffMins}m ago`
    return 'Just now'
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
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
              style={{ background: 'linear-gradient(135deg, #582dff, #3a137a)' }}
            >
              {payment.userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-white font-semibold">{payment.userName}</div>
              <div className="text-white/60 text-sm">{payment.userEmail}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-white/60 text-xs mb-1">Property</div>
              <div className="text-white font-medium text-sm">{payment.property}</div>
            </div>
            <div>
              <div className="text-white/60 text-xs mb-1">Tier</div>
              <div className="text-white font-medium text-sm">{payment.tier}</div>
            </div>
            <div>
              <div className="text-white/60 text-xs mb-1">Buy-In</div>
              <div className="text-white font-bold text-sm">{payment.minimum}</div>
            </div>
            <div>
              <div className="text-white/60 text-xs mb-1">Duration</div>
              <div className="text-white font-medium text-sm">{payment.duration || '-'}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-3">
            <div>
              <div className="text-white/60 text-xs mb-1">Location</div>
              <div className="text-white/85 text-sm">{payment.location || '-'}</div>
            </div>
            <div>
              <div className="text-white/60 text-xs mb-1">Projected Band</div>
              <div className="text-white/85 text-sm">{payment.projectedBand || '-'}</div>
            </div>
            <div>
              <div className="text-white/60 text-xs mb-1">Payment / TXID</div>
              <div className="text-white/85 text-sm">{payment.coinType || '-'}</div>
              <div className="text-white/60 text-xs font-mono break-all">{payment.txid || '-'}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <Clock size={14} className="text-white/40" />
            <span className="text-white/40 text-xs">{timeAgo()}</span>
            <span className="text-white/30 text-xs">•</span>
            <span className="text-white/60 text-xs">{statusLabel(payment.status)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {payment.proof?.paymentProofUrl && (
            <div
              className="px-3 py-2 rounded-lg text-xs text-white/80"
              style={{
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              Proof submitted
              <div className="mt-2">
                <a
                  href={payment.proof.paymentProofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-200 hover:text-blue-100 underline"
                >
                  View uploaded proof{payment.proof.attachmentName ? `: ${payment.proof.attachmentName}` : ''}
                </a>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <LoadingButton
              onClick={() => setConfirmApprove(true)}
              isLoading={isProcessing}
              loadingText="Processing..."
              className="flex-1 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
              }}
            >
              <Check size={18} />
              Approve
            </LoadingButton>

            <LoadingButton
              onClick={() => setConfirmReject(true)}
              isLoading={isProcessing}
              loadingText="Processing..."
              className="flex-1 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#ffffff',
              }}
            >
              <X size={18} />
              Reject
            </LoadingButton>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmApprove}
        title="Approve real-estate payment?"
        description={`Approve ${payment.tier} for ${payment.userName || payment.userEmail}?`}
        confirmLabel="Approve"
        isBusy={isProcessing}
        onConfirm={async () => {
          setConfirmApprove(false)
          await handleStatusUpdate('closed')
        }}
        onCancel={() => setConfirmApprove(false)}
      />

      <ConfirmDialog
        open={confirmReject}
        title="Reject real-estate payment?"
        description={`Reject ${payment.tier} for ${payment.userName || payment.userEmail}?`}
        confirmLabel="Reject"
        isDanger
        isBusy={isProcessing}
        onConfirm={async () => {
          setConfirmReject(false)
          await handleStatusUpdate('rejected')
        }}
        onCancel={() => setConfirmReject(false)}
      />
    </div>
  )
}

