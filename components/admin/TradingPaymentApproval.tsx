'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Clock } from 'lucide-react'
import LoadingButton from '@/components/ui/LoadingButton'
import { useToast } from '@/components/ui/ToastProvider'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

interface TradingPaymentApprovalProps {
  payment: {
    id: number
    userId: number
    userName: string
    userEmail: string
    planName: string
    investmentUsd: number
    durationHours: number
    createdAt: Date
    proof?: {
      paymentProofUrl: string | null
      transactionId: string | null
      cryptoType: string | null
      createdAt: Date
    } | null
  }
}

export default function TradingPaymentApproval({ payment }: TradingPaymentApprovalProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [txid, setTxid] = useState(payment.proof?.transactionId || '')
  const [txidError, setTxidError] = useState<string | null>(null)
  const [confirmApprove, setConfirmApprove] = useState(false)
  const [confirmReject, setConfirmReject] = useState(false)
  const isAccountBalancePayment = (payment.proof?.transactionId || '').startsWith('Account Balance -')

  const getTxidError = (value: string) => {
    if (isAccountBalancePayment) return null
    if (!value) return null
    const trimmed = value.trim()
    const isHex64 = /^[a-fA-F0-9]{64}$/.test(trimmed)
    const isEthTx = /^0x[a-fA-F0-9]{64}$/.test(trimmed)
    if (!(isHex64 || isEthTx)) {
      return 'TXID must be 64 hex or 0x + 64 hex characters.'
    }
    return null
  }

  const handleApprove = async () => {
    setIsProcessing(true)
    const validationError = getTxidError(txid)
    if (validationError) {
      setTxidError(validationError)
      showToast(validationError, 'error')
      setIsProcessing(false)
      return
    }

    try {
      const response = await fetch('/api/admin/trading/approve-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradingUserPlanId: payment.id,
          txid: isAccountBalancePayment ? null : txid || null,
        }),
      })

      if (response.ok) {
        showToast('Payment approved. Portfolio activated.', 'success')
        router.refresh()
      } else {
        const data = await response.json().catch(() => null)
        showToast(data?.error || 'Error approving payment.', 'error')
      }
    } catch (error) {
      console.error('Trading payment approval error:', error)
      showToast('Error approving payment', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch('/api/admin/trading/reject-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradingUserPlanId: payment.id,
        }),
      })

      if (response.ok) {
        showToast('Payment rejected and plan cancelled', 'success')
        router.refresh()
      } else {
        const data = await response.json().catch(() => null)
        showToast(data?.error || 'Error rejecting payment.', 'error')
      }
    } catch (error) {
      console.error('Trading payment rejection error:', error)
      showToast('Error rejecting payment', 'error')
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
              <div className="text-white/60 text-xs mb-1">Plan</div>
              <div className="text-white font-medium text-sm">{payment.planName}</div>
            </div>
            <div>
              <div className="text-white/60 text-xs mb-1">Duration</div>
              <div className="text-white font-medium text-sm">{payment.durationHours} hours</div>
            </div>
            <div>
              <div className="text-white/60 text-xs mb-1">Investment</div>
              <div className="text-white font-bold text-sm">${payment.investmentUsd.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-white/60 text-xs mb-1">Proof</div>
              <div className="text-white font-medium text-sm">{payment.proof?.cryptoType || '—'}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <Clock size={14} className="text-white/40" />
            <span className="text-white/40 text-xs">{timeAgo()}</span>
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
              {payment.proof.transactionId ? ` - TXID: ${payment.proof.transactionId}` : ''}
              <div className="mt-2">
                <a
                  href={payment.proof.paymentProofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-200 hover:text-blue-100 underline"
                >
                  View uploaded proof
                </a>
              </div>
            </div>
          )}

          <input
            type="text"
            placeholder={isAccountBalancePayment ? 'Account balance payment (TXID not required)' : 'Transaction ID (optional)'}
            value={txid}
            disabled={isAccountBalancePayment}
            onChange={(e) => {
              setTxid(e.target.value)
              if (txidError) {
                setTxidError(null)
              }
            }}
            className="px-4 py-2 rounded-lg text-sm font-mono"
            style={{
              background: isAccountBalancePayment ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              opacity: isAccountBalancePayment ? 0.75 : 1,
            }}
          />
          {txidError && <div className="text-xs text-red-300">{txidError}</div>}

          <div className="flex gap-2">
            <LoadingButton
              onClick={() => {
                const validationError = getTxidError(txid)
                if (validationError) {
                  setTxidError(validationError)
                  showToast(validationError, 'error')
                  return
                }
                setConfirmApprove(true)
              }}
              isLoading={isProcessing}
              loadingText="Processing..."
              className="flex-1 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105"
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
              className="flex-1 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105"
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
        title="Approve trading payment?"
        description={`Approve payment for ${payment.userName || payment.userEmail}? This will activate portfolio management.`}
        confirmLabel="Approve"
        isBusy={isProcessing}
        onConfirm={async () => {
          setConfirmApprove(false)
          await handleApprove()
        }}
        onCancel={() => setConfirmApprove(false)}
      />

      <ConfirmDialog
        open={confirmReject}
        title="Reject trading payment?"
        description={`Reject payment for ${payment.userName || payment.userEmail}? This will cancel the selection.`}
        confirmLabel="Reject"
        isDanger
        isBusy={isProcessing}
        onConfirm={async () => {
          setConfirmReject(false)
          await handleReject()
        }}
        onCancel={() => setConfirmReject(false)}
      />
    </div>
  )
}
