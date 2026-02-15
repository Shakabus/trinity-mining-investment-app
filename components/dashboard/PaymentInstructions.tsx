'use client'

import Link from 'next/link'
import { useState } from 'react'
import LoadingButton from '@/components/ui/LoadingButton'
import { useToast } from '@/components/ui/ToastProvider'
import { useCurrency } from '@/components/currency/CurrencyProvider'
import LivePaymentsPageClient from '@/components/marketing/LivePaymentsPageClient'

interface PaymentInstructionsProps {
  plan: {
    id: number
    planName: string
    selectedDurationDays: number
    finalPrice: number
  }
  accountBalanceUsd: number
}

export default function PaymentInstructions({ plan, accountBalanceUsd }: PaymentInstructionsProps) {
  const { showToast } = useToast()
  const { format } = useCurrency()
  const [isPayingFromBalance, setIsPayingFromBalance] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  const handlePayFromBalance = async () => {
    try {
      setIsPayingFromBalance(true)
      setPaymentError(null)

      const response = await fetch('/api/user/account-balance/pay-mining-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPlanId: plan.id }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        const message = data?.error || 'Unable to pay from account balance.'
        setPaymentError(message)
        showToast(message, 'error')
        return
      }

      showToast('Plan activated using account balance.', 'success')
      window.location.href = '/dashboard'
    } catch (error) {
      console.error('Pay from account balance error:', error)
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
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Plan Payment</h1>
        <p className="text-white/70">All plan payments are processed directly from your account balance.</p>
      </div>

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
        {paymentError ? <div className="text-sm text-rose-200 mt-3">{paymentError}</div> : null}
      </div>

      <LivePaymentsPageClient />

      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/dashboard"
          className="flex-1 py-4 rounded-full font-semibold text-center transition-all"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
          }}
        >
          Back to Dashboard
        </Link>
        <Link
          href="/dashboard/plans"
          className="flex-1 py-4 rounded-full font-semibold text-center transition-all"
          style={{
            background: 'linear-gradient(135deg, #582dff, #3a137a)',
            color: '#ffffff',
          }}
        >
          View Other Plans
        </Link>
      </div>
    </div>
  )
}
