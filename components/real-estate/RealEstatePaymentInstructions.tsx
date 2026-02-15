'use client'

import Link from 'next/link'
import { useState } from 'react'
import LoadingButton from '@/components/ui/LoadingButton'
import { useToast } from '@/components/ui/ToastProvider'
import { useCurrency } from '@/components/currency/CurrencyProvider'
import LivePaymentsPageClient from '@/components/marketing/LivePaymentsPageClient'

type RealEstateSelection = {
  propertyId: string
  title: string
  location: string
  tier: string
  minimum: string
  duration: string
  payoutModel: string
  projectedBand: string
  illustrativeOutcome: string
}

type RealEstatePaymentInstructionsProps = {
  selection: RealEstateSelection
  accountBalanceUsd: number
}

export default function RealEstatePaymentInstructions({
  selection,
  accountBalanceUsd,
}: RealEstatePaymentInstructionsProps) {
  const { showToast } = useToast()
  const { format } = useCurrency()
  const [isPayingFromBalance, setIsPayingFromBalance] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  const parsedMinimumUsd = Number(selection.minimum.replace(/[^0-9.]/g, ''))
  const displayAmount = Number.isFinite(parsedMinimumUsd) ? parsedMinimumUsd : 0

  const handlePayFromBalance = async () => {
    try {
      setIsPayingFromBalance(true)
      setPaymentError(null)

      const response = await fetch('/api/user/account-balance/pay-real-estate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selection),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        const message = data?.error || 'Unable to submit real-estate buy-in from account balance.'
        setPaymentError(message)
        showToast(message, 'error')
        return
      }

      showToast('Real-estate buy-in submitted from account balance for review.', 'success')
      window.location.href = '/dashboard/real-estate?buyin=pending'
    } catch (error) {
      console.error('Real-estate pay from account balance error:', error)
      const message = 'Network error. Please try again.'
      setPaymentError(message)
      showToast(message, 'error')
    } finally {
      setIsPayingFromBalance(false)
    }
  }

  return (
    <div className="space-y-6 py-4">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Real Estate Buy-In Payment</h1>
        <p className="text-white/70">Real-estate buy-ins are paid only from your account balance.</p>
      </div>

      <div
        className="p-6 md:p-8 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        <h2 className="text-xl font-semibold text-white mb-4">Buy-In Summary</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center gap-3">
            <span className="text-white/70">Property:</span>
            <span className="text-white font-semibold text-right">{selection.title}</span>
          </div>
          <div className="flex justify-between items-center gap-3">
            <span className="text-white/70">Location:</span>
            <span className="text-white font-semibold text-right">{selection.location}</span>
          </div>
          <div className="flex justify-between items-center gap-3">
            <span className="text-white/70">Tier:</span>
            <span className="text-white font-semibold text-right">{selection.tier}</span>
          </div>
          <div className="flex justify-between items-center gap-3">
            <span className="text-white/70">Duration:</span>
            <span className="text-white font-semibold text-right">{selection.duration || '-'}</span>
          </div>
          <div className="flex justify-between items-center gap-3">
            <span className="text-white/70">Payout Basis:</span>
            <span className="text-white font-semibold text-right">{selection.payoutModel || '-'}</span>
          </div>
          <div className="border-t border-white/10 pt-3 mt-3">
            <div className="flex justify-between items-center">
              <span className="text-white text-lg font-semibold">Buy-In Amount:</span>
              <span className="text-3xl font-bold text-white">{format(displayAmount)}</span>
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
        {paymentError ? <div className="text-sm text-rose-200 mt-3">{paymentError}</div> : null}
      </div>

      <LivePaymentsPageClient />

      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/dashboard/real-estate"
          className="flex-1 py-4 rounded-full font-semibold text-center transition-all"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
          }}
        >
          Back to Portfolio
        </Link>
        <Link
          href="/dashboard/support"
          className="flex-1 py-4 rounded-full font-semibold text-center transition-all"
          style={{
            background: 'linear-gradient(135deg, #582dff, #3a137a)',
            color: '#ffffff',
          }}
        >
          Contact Support
        </Link>
      </div>
    </div>
  )
}
