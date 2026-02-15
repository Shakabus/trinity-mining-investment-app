'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import LoadingButton from '@/components/ui/LoadingButton'

type BalanceEntry = {
  id: number
  createdAt: string
  direction: 'credit' | 'debit'
  status: 'pending' | 'settled' | 'rejected'
  amountUsd: number
  source: string
  note?: string
  metadata?: Record<string, unknown>
}

type Props = {
  balanceUsd: number
  pendingCreditsUsd: number
  entries: BalanceEntry[]
}

const COINS = ['USDT', 'BTC', 'ETH', 'SOL'] as const

const sourceLabel: Record<string, string> = {
  funding_deposit: 'Account funding',
  mining_plan_purchase: 'Mining plan purchase',
  trading_plan_purchase: 'Trading plan purchase',
  mining_withdrawal: 'Mining withdrawal',
  trading_withdrawal: 'Trading withdrawal',
  referral_withdrawal: 'Referral withdrawal',
  external_payment: 'Approved mining payment',
  external_trading_payment: 'Approved trading payment',
  withdrawal_reversal: 'Withdrawal reversal',
}

export default function AccountFundPageClient({ balanceUsd, pendingCreditsUsd, entries }: Props) {
  const [amountUsd, setAmountUsd] = useState('')
  const [coinType, setCoinType] = useState<(typeof COINS)[number]>('USDT')
  const [txid, setTxid] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [status, setStatus] = useState<{ type: 'idle' | 'error' | 'success'; message: string }>({
    type: 'idle',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const pendingFunding = useMemo(
    () => entries.filter(entry => entry.source === 'funding_deposit' && entry.status === 'pending'),
    [entries]
  )

  const submit = async () => {
    const amount = Number(amountUsd)
    if (!Number.isFinite(amount) || amount < 10) {
      setStatus({ type: 'error', message: 'Enter a valid amount (minimum $10).' })
      return
    }
    if (!txid.trim()) {
      setStatus({ type: 'error', message: 'Transaction ID is required.' })
      return
    }
    if (!proofFile) {
      setStatus({ type: 'error', message: 'Upload payment proof before submitting.' })
      return
    }

    try {
      setIsSubmitting(true)
      setStatus({ type: 'idle', message: '' })

      const formData = new FormData()
      formData.append('amountUsd', String(amount))
      formData.append('coinType', coinType)
      formData.append('txid', txid.trim())
      formData.append('file', proofFile)

      const response = await fetch('/api/user/account-balance/fund', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Funding request failed.')
      }

      setStatus({ type: 'success', message: 'Funding request submitted. Awaiting admin approval.' })
      setAmountUsd('')
      setTxid('')
      setProofFile(null)
      setTimeout(() => window.location.reload(), 900)
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Funding request failed.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 lg:px-6 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white">Fund Account</h1>
          <p className="text-white/70 mt-2">Submit funding proof. Balance updates after admin approval.</p>
        </div>
        <Link href="/dashboard" className="text-sm font-semibold text-white/85 underline underline-offset-4">
          Back to dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className="p-5 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.16), rgba(16, 185, 129, 0.04))',
            border: '1px solid rgba(16, 185, 129, 0.35)',
          }}
        >
          <div className="text-sm text-emerald-100/80">Available balance</div>
          <div className="text-3xl font-bold text-emerald-200 mt-1">
            ${balanceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div
          className="p-5 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.16), rgba(59, 130, 246, 0.04))',
            border: '1px solid rgba(59, 130, 246, 0.35)',
          }}
        >
          <div className="text-sm text-blue-100/80">Pending credits</div>
          <div className="text-3xl font-bold text-blue-200 mt-1">
            ${pendingCreditsUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div
        className="p-6 md:p-8 rounded-3xl space-y-4"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <h2 className="text-xl font-semibold text-white">Submit account funding proof</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-white/80 mb-2">Amount (USD)</label>
            <input
              type="number"
              min={10}
              step="0.01"
              value={amountUsd}
              onChange={event => setAmountUsd(event.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
              placeholder="e.g. 500"
            />
          </div>
          <div>
            <label className="block text-sm text-white/80 mb-2">Coin</label>
            <select
              value={coinType}
              onChange={event => setCoinType(event.target.value as (typeof COINS)[number])}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
            >
              {COINS.map(coin => (
                <option key={coin} value={coin} className="bg-zinc-900">
                  {coin}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-white/80 mb-2">Transaction ID</label>
            <input
              type="text"
              value={txid}
              onChange={event => setTxid(event.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
              placeholder="Enter TXID"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-white/80 mb-2">Proof upload (image or PDF)</label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={event => setProofFile(event.target.files?.[0] || null)}
            className="w-full text-sm text-white/70"
          />
        </div>

        {status.type !== 'idle' && (
          <div className={`text-sm ${status.type === 'error' ? 'text-red-300' : 'text-emerald-300'}`}>
            {status.message}
          </div>
        )}

        <LoadingButton
          onClick={submit}
          isLoading={isSubmitting}
          loadingText="Submitting..."
          className="px-6 py-3 rounded-full font-semibold"
          style={{
            background: 'linear-gradient(135deg, #582dff, #3a137a)',
            color: '#ffffff',
          }}
        >
          Submit funding request
        </LoadingButton>
      </div>

      <div
        className="p-6 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <h2 className="text-xl font-semibold text-white mb-4">Recent balance history</h2>
        {entries.length === 0 ? (
          <div className="text-sm text-white/65">No balance events yet.</div>
        ) : (
          <div className="space-y-2">
            {entries.slice(0, 25).map(entry => {
              const isCredit = entry.direction === 'credit'
              const amountClass = isCredit ? 'text-emerald-300' : 'text-rose-300'
              const statusLabel =
                entry.status === 'settled' ? 'Settled' : entry.status === 'pending' ? 'Pending' : 'Rejected'

              return (
                <div key={entry.id} className="rounded-xl border border-white/10 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm text-white/90">
                      {sourceLabel[entry.source] || 'Balance event'}
                    </div>
                    <div className={`text-sm font-semibold ${amountClass}`}>
                      {isCredit ? '+' : '-'}$
                      {entry.amountUsd.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-1 text-xs text-white/60">
                    <span>{new Date(entry.createdAt).toLocaleString()}</span>
                    <span>{statusLabel}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {pendingFunding.length > 0 && (
        <div className="text-xs text-yellow-200/85">
          You currently have {pendingFunding.length} funding request(s) awaiting review.
        </div>
      )}
    </div>
  )
}
