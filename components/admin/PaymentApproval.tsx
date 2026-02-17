'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Clock } from 'lucide-react'
import LoadingButton from '@/components/ui/LoadingButton'
import { useToast } from '@/components/ui/ToastProvider'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

interface PaymentApprovalProps {
  payment: {
    id: number
    userId: number
    userName: string
    userEmail: string
    planName: string
    coinType: string
    durationDays: number
    finalPrice: number
    createdAt: Date
    proof?: {
      paymentProofUrl: string | null
      transactionId: string | null
      cryptoType: string | null
      createdAt: Date
    } | null
  }
}

export default function PaymentApproval({ payment }: PaymentApprovalProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [txid, setTxid] = useState(payment.proof?.transactionId || '')
  const [txidError, setTxidError] = useState<string | null>(null)

  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [confirmApprove, setConfirmApprove] = useState(false)
  const [confirmReject, setConfirmReject] = useState(false)
  const isAccountBalancePayment = (payment.proof?.transactionId || '').startsWith('Account Balance -')

  const getTxidError = (value: string) => {
    if (isAccountBalancePayment) return null
    if (!value) return null
    const trimmed = value.trim()
    const coin = payment.coinType?.toUpperCase() || ''
    const btcRegex = /^[a-fA-F0-9]{64}$/
    const ethRegex = /^0x[a-fA-F0-9]{64}$/
    const ltcRegex = /^[a-fA-F0-9]{64}$/
    const isBtc = coin === 'BTC'
    const isEth = coin === 'ETH'
    const isLtc = coin === 'LTC'
    const isMulti = coin === 'MULTI'

    if (isBtc && !btcRegex.test(trimmed)) {
      return 'BTC TXID must be 64 hex characters.'
    }
    if (isEth && !ethRegex.test(trimmed)) {
      return 'ETH TXID must start with 0x and be 66 characters total.'
    }
    if (isLtc && !ltcRegex.test(trimmed)) {
      return 'LTC TXID must be 64 hex characters.'
    }
    if (isMulti && !(btcRegex.test(trimmed) || ethRegex.test(trimmed))) {
      return 'TXID must be valid BTC/LTC (64 hex) or ETH (0x + 64 hex).'
    }
    return null
  }

  const handleApprove = async () => {
    setStatusMessage(null)
    setIsProcessing(true)
    const validationError = getTxidError(txid)
    if (validationError) {
      setTxidError(validationError)
      setIsProcessing(false)
      showToast(validationError, 'error')
      return
    }

    try {
      const response = await fetch('/api/admin/approve-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPlanId: payment.id,
          txid: isAccountBalancePayment ? null : txid || null
        })
      })

      if (response.ok) {
        showToast('Payment approved and account activated!', 'success')
        setStatusMessage('Payment approved and account activated.')
        router.refresh()
      } else {
        const data = await response.json().catch(() => null)
        const message = data?.error || 'Error approving payment.'
        showToast(message, 'error')
        setStatusMessage(message)
      }
    } catch (error) {
      console.error('Error:', error)
      showToast('Error approving payment', 'error')
      setStatusMessage('Network error approving payment. Try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    setStatusMessage(null)
    setIsProcessing(true)

    try {
      const response = await fetch('/api/admin/reject-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPlanId: payment.id
        })
      })

      if (response.ok) {
        showToast('Payment rejected and plan cancelled', 'success')
        setStatusMessage('Payment rejected and plan cancelled.')
        router.refresh()
      } else {
        const data = await response.json().catch(() => null)
        const message = data?.error || 'Error rejecting payment.'
        showToast(message, 'error')
        setStatusMessage(message)
      }
    } catch (error) {
      console.error('Error:', error)
      showToast('Error rejecting payment', 'error')
      setStatusMessage('Network error rejecting payment. Try again.')
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
        {/* User & Plan Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
              style={{
                background: 'linear-gradient(135deg, #582dff, #3a137a)',
              }}
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
              <div className="text-white/60 text-xs mb-1">Coin</div>
              <div className="text-white font-medium text-sm">{payment.coinType}</div>
            </div>
            <div>
              <div className="text-white/60 text-xs mb-1">Duration</div>
              <div className="text-white font-medium text-sm">{payment.durationDays} days</div>
            </div>
            <div>
              <div className="text-white/60 text-xs mb-1">Amount</div>
              <div className="text-white font-bold text-sm">${payment.finalPrice.toLocaleString()}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <Clock size={14} className="text-white/40" />
            <span className="text-white/40 text-xs">{timeAgo()}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <div
            className="px-3 py-2 rounded-lg text-xs"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#cbd5f5',
            }}
          >
            Approve: activate plan + mining. Reject: cancel plan.
          </div>
          {statusMessage && <div className="text-xs text-white/70">{statusMessage}</div>}
          {payment.proof?.paymentProofUrl && (
            <div
              className="px-3 py-2 rounded-lg text-xs text-white/80"
              style={{
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              Proof submitted ({payment.proof.cryptoType || payment.coinType})
              {payment.proof.transactionId ? ` - TXID: ${payment.proof.transactionId}` : ''}
              <div className="mt-2">
                {payment.proof.paymentProofUrl ? (
                  <a
                    href={payment.proof.paymentProofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-200 hover:text-blue-100 underline"
                  >
                    View uploaded proof
                  </a>
                ) : (
                  <span className="text-white/60">No proof file attached.</span>
                )}
              </div>
            </div>
          )}

          {/* TXID Input */}
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
        title="Approve payment?"
        description={`Approve payment for ${payment.userName || payment.userEmail}? This will activate their plan.`}
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
        title="Reject payment?"
        description={`Reject payment for ${payment.userName || payment.userEmail}? This will cancel their plan selection.`}
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
