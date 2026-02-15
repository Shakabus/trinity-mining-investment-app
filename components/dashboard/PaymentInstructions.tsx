'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Copy, Check, AlertCircle } from 'lucide-react'
import LoadingButton from '@/components/ui/LoadingButton'
import { useToast } from '@/components/ui/ToastProvider'
import { useCurrency } from '@/components/currency/CurrencyProvider'

interface PaymentInstructionsProps {
  plan: {
    id: number
    status: string
    paymentStatus: string
    planName: string
    coinType: string
    selectedDurationDays: number
    finalPrice: number
    createdAt: Date
    payment?: {
      id: number
      transactionId: string | null
      paymentProofUrl: string | null
      createdAt: Date
    } | null
  }
  accountBalanceUsd: number
}

// Wallet addresses for different cryptocurrencies
const WALLET_ADDRESSES = {
  BTC: 'bc1q76ztuupz9sycs3hf0l8q0t3mt5j78rxr29cwv4',
  ETH: '0x8610A9E40FAD02Ce4157FbbFb38752aBE1264334',
  USDT: '0x8610A9E40FAD02Ce4157FbbFb38752aBE1264334',
  SOL: '54fnCmk1gLDhtzDcd8xt7ar4YKKu9sJqqwyXNoDZMpw8',
  MULTI: 'bc1q76ztuupz9sycs3hf0l8q0t3mt5j78rxr29cwv4' // Default to BTC for multi-asset
}

export default function PaymentInstructions({ plan, accountBalanceUsd }: PaymentInstructionsProps) {
  const { showToast } = useToast()
  const { format } = useCurrency()
  const searchParams = useSearchParams()
  const [copied, setCopied] = useState(false)
  const [selectedCrypto, setSelectedCrypto] = useState<keyof typeof WALLET_ADDRESSES>(
    (plan.coinType as keyof typeof WALLET_ADDRESSES) || 'BTC'
  )
  const [showVerify, setShowVerify] = useState(false)
  const [txid, setTxid] = useState(plan.payment?.transactionId || '')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [isPayingFromBalance, setIsPayingFromBalance] = useState(false)

  const walletAddress = WALLET_ADDRESSES[selectedCrypto]

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const cryptoOptions = ['BTC', 'ETH', 'USDT', 'SOL']

  useEffect(() => {
    if (searchParams?.get('verify') === '1') {
      setShowVerify(true)
    }
  }, [searchParams])

  const validateTxid = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return 'Transaction ID is required.'
    const isHex64 = /^[a-fA-F0-9]{64}$/.test(trimmed)
    const isEthTx = /^0x[a-fA-F0-9]{64}$/.test(trimmed)
    const isSolTx = trimmed.length >= 32
    const coin = selectedCrypto
    if (coin === 'ETH' || coin === 'USDT') {
      return isEthTx ? null : 'ETH/USDT TXID must start with 0x and be 66 characters total.'
    }
    if (coin === 'BTC') {
      return isHex64 ? null : 'BTC TXID must be 64 hex characters.'
    }
    if (coin === 'SOL') {
      return isSolTx ? null : 'SOL transaction signature must be at least 32 characters.'
    }
    return isHex64 || isEthTx ? null : 'TXID format looks invalid.'
  }

  const handleSubmitProof = async () => {
    const txidError = validateTxid(txid)
    if (txidError) {
      setVerifyError(txidError)
      return
    }
    if (!proofFile) {
      setVerifyError('Please upload a payment proof file.')
      return
    }

    setIsSubmitting(true)
    setVerifyError(null)

    try {
      const formData = new FormData()
      formData.append('userPlanId', String(plan.id))
      formData.append('coinType', selectedCrypto)
      formData.append('txid', txid.trim())
      formData.append('file', proofFile)

      const response = await fetch('/api/user/submit-payment-proof', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        const message = data?.error || 'Failed to submit payment proof.'
        setVerifyError(message)
        showToast(message, 'error')
        return
      }

      showToast('Payment proof submitted. Awaiting verification.', 'success')
      setShowVerify(false)
    } catch (error) {
      console.error('Submit payment proof error:', error)
      setVerifyError('Network error. Please try again.')
      showToast('Network error. Please try again.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePayFromBalance = async () => {
    try {
      setIsPayingFromBalance(true)
      setVerifyError(null)
      const response = await fetch('/api/user/account-balance/pay-mining-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPlanId: plan.id }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        const message = data?.error || 'Unable to pay from account balance.'
        setVerifyError(message)
        showToast(message, 'error')
        return
      }

      showToast('Plan activated using account balance.', 'success')
      window.location.href = '/dashboard'
    } catch (error) {
      console.error('Pay from account balance error:', error)
      setVerifyError('Network error. Please try again.')
      showToast('Network error. Please try again.', 'error')
    } finally {
      setIsPayingFromBalance(false)
    }
  }

  return (
    <div className="space-y-6 py-4">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Complete Your Payment
        </h1>
        <p className="text-white/70">
          Follow the instructions below to activate your mining plan
        </p>
        {plan.status === 'selected' && (
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mt-4"
            style={{
              background: 'rgba(234, 179, 8, 0.18)',
              border: '1px solid rgba(234, 179, 8, 0.4)',
              color: '#fde047',
            }}
          >
            <AlertCircle size={14} />
            Proof not submitted yet
          </div>
        )}
      </div>

      {/* Plan Summary */}
      <div 
        className="p-6 md:p-8 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        <h2 className="text-xl font-semibold text-white mb-4">Order Summary</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-white/70">Plan:</span>
            <span className="text-white font-semibold">{plan.planName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/70">Duration:</span>
            <span className="text-white font-semibold">{plan.selectedDurationDays} days</span>
          </div>
          <div className="border-t border-white/10 pt-3 mt-3">
            <div className="flex justify-between items-center">
              <span className="text-white text-lg font-semibold">Total Amount:</span>
              <span className="text-3xl font-bold text-white">{format(plan.finalPrice)}</span>
            </div>
          </div>
        </div>
      </div>

      <div
        className="p-6 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.16), rgba(16, 185, 129, 0.04))',
          border: '1px solid rgba(16, 185, 129, 0.35)',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-sm text-emerald-100/85">Account balance available</div>
            <div className="text-2xl font-bold text-emerald-200">{format(accountBalanceUsd)}</div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <LoadingButton
              onClick={handlePayFromBalance}
              isLoading={isPayingFromBalance}
              loadingText="Processing..."
              className="px-5 py-2.5 rounded-full text-sm font-semibold"
              style={{
                background: 'linear-gradient(135deg, #10b981, #047857)',
                color: '#ffffff',
              }}
            >
              Pay with Account Balance
            </LoadingButton>
            <Link href="/dashboard/account/fund" className="text-sm font-semibold text-emerald-100 underline underline-offset-4">
              Fund Account
            </Link>
          </div>
        </div>
      </div>

      {/* Crypto Selection (for Multi-asset plans) */}
      {cryptoOptions.length > 1 && (
        <div 
          className="p-6 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <h3 className="text-lg font-semibold text-white mb-4">Select Payment Currency</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {cryptoOptions.map((crypto) => (
              <button
                key={crypto}
                onClick={() => setSelectedCrypto(crypto as keyof typeof WALLET_ADDRESSES)}
                className="p-4 rounded-xl transition-all"
                style={{
                  background: selectedCrypto === crypto 
                    ? 'linear-gradient(135deg, rgba(88, 45, 255, 0.3), rgba(58, 19, 122, 0.2))'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: selectedCrypto === crypto 
                    ? '2px solid rgba(88, 45, 255, 0.5)' 
                    : '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <div className="text-white font-semibold">{crypto}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Payment Instructions */}
      <div 
        className="p-6 md:p-8 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        <h2 className="text-xl font-semibold text-white mb-6">Payment Instructions</h2>

        {/* Step 1 */}
        <div className="mb-6">
          <div className="flex items-start gap-3 mb-3">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold"
              style={{
                background: 'linear-gradient(135deg, #582dff, #3a137a)',
              }}
            >
              1
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2">Send {selectedCrypto} to this address:</h3>
              <div 
                className="p-4 rounded-xl break-all font-mono text-sm"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-white">{walletAddress}</span>
                  <button
                    onClick={handleCopy}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                    title="Copy address"
                  >
                    {copied ? (
                      <Check size={20} className="text-green-400" />
                    ) : (
                      <Copy size={20} className="text-white/70" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="mb-6">
          <div className="flex items-start gap-3">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold"
              style={{
                background: 'linear-gradient(135deg, #582dff, #3a137a)',
              }}
            >
              2
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2">Network Information:</h3>
              <div className="space-y-2 text-sm text-white/70">
                <p>
                  • Network:{' '}
                  {selectedCrypto === 'USDT'
                    ? 'ERC-20 (Ethereum)'
                    : selectedCrypto === 'ETH'
                    ? 'Ethereum'
                    : selectedCrypto === 'SOL'
                    ? 'Solana'
                    : 'Bitcoin'}
                </p>
                <p>• Amount: {format(plan.finalPrice)} equivalent in {selectedCrypto}</p>
                <p>
                  • Minimum Confirmations:{' '}
                  {selectedCrypto === 'BTC'
                    ? '3'
                    : selectedCrypto === 'ETH' || selectedCrypto === 'USDT'
                    ? '12'
                    : '6'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div>
          <div className="flex items-start gap-3">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold"
              style={{
                background: 'linear-gradient(135deg, #582dff, #3a137a)',
              }}
            >
              3
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2">After sending payment:</h3>
              <p className="text-sm text-white/70">
                Your payment will be verified and your account activated within 24 hours. 
                You will receive an email confirmation once your mining plan is active.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Box */}
      <div 
        className="p-6 rounded-3xl"
        style={{
          background: 'rgba(234, 179, 8, 0.1)',
          border: '1px solid rgba(234, 179, 8, 0.3)',
        }}
      >
        <div className="flex gap-3">
          <AlertCircle size={24} className="text-yellow-300 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-yellow-300 mb-2">Important Notes</h3>
            <ul className="space-y-1 text-sm text-yellow-200/80">
              <li>• Double-check the wallet address before sending</li>
              <li>• Send ONLY {selectedCrypto} to this address</li>
              <li>• Sending other cryptocurrencies may result in permanent loss</li>
              <li>• Keep your transaction ID (TXID) for reference</li>
            </ul>
          </div>
        </div>
      </div>

      <div
        className="p-6 rounded-3xl"
        style={{
          background: 'rgba(59, 130, 246, 0.12)',
          border: '1px solid rgba(59, 130, 246, 0.28)',
        }}
      >
        <div className="flex gap-3 items-start">
          <AlertCircle size={22} className="text-blue-300 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-200 mb-2">Need another payment option?</h3>
            <p className="text-sm text-blue-100/85 leading-6">
              If you cannot use the listed payment channels, contact support and request a dedicated settlement option.
            </p>
            <Link href="/dashboard/support" className="inline-block mt-3 text-sm font-semibold text-white underline underline-offset-4">
              Open Support Center
            </Link>
          </div>
        </div>
      </div>

      {plan.payment && (
        <div
          className="p-4 rounded-2xl text-sm text-white/70"
          style={{
            background: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
          }}
        >
          Payment proof submitted on {new Date(plan.payment.createdAt).toLocaleString()}. Awaiting verification.
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <a
          href="/dashboard"
          className="flex-1 py-4 rounded-full font-semibold text-center transition-all"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
          }}
        >
          Back to Dashboard
        </a>
        <a
          href="/dashboard/plans"
          className="flex-1 py-4 rounded-full font-semibold text-center transition-all"
          style={{
            background: 'linear-gradient(135deg, #582dff, #3a137a)',
            color: '#ffffff',
          }}
        >
          View Other Plans
        </a>
      </div>

      <div className="flex justify-center">
        <button
          onClick={() => setShowVerify(true)}
          className="px-6 py-3 rounded-full font-semibold transition-all"
          style={{
            background: 'linear-gradient(135deg, rgba(88, 45, 255, 0.4), rgba(58, 19, 122, 0.3))',
            border: '1px solid rgba(88, 45, 255, 0.5)',
            color: '#ffffff',
          }}
        >
          Verify Payment (Upload Proof)
        </button>
      </div>

      {showVerify && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowVerify(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-6 relative"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.04))',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(24px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-white mb-2">Submit Payment Proof</h3>
            <p className="text-white/60 text-sm mb-4">
              Upload a screenshot or PDF of your payment receipt and enter the transaction ID.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Transaction ID</label>
                <input
                  type="text"
                  value={txid}
                  onChange={(event) => setTxid(event.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none text-sm font-mono"
                  placeholder="Paste TXID here"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Payment Proof</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(event) => setProofFile(event.target.files?.[0] || null)}
                  className="w-full text-sm text-white/70"
                />
                <div className="text-xs text-white/50 mt-2">
                  Accepted formats: JPG, PNG, WebP, PDF. Max 5MB.
                </div>
              </div>
            </div>

            {verifyError && <div className="text-sm text-red-300 mt-4">{verifyError}</div>}

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowVerify(false)}
                className="px-4 py-2 rounded-lg text-sm text-white/70 hover:text-white transition-all"
              >
                Cancel
              </button>
              <LoadingButton
                onClick={handleSubmitProof}
                isLoading={isSubmitting}
                loadingText="Submitting..."
                className="px-5 py-2 rounded-lg text-sm font-semibold"
                style={{
                  background: 'linear-gradient(135deg, #582dff, #3a137a)',
                  color: '#ffffff',
                }}
              >
                Submit Proof
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
