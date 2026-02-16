'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import LoadingButton from '@/components/ui/LoadingButton'
import LivePaymentsPageClient from '@/components/marketing/LivePaymentsPageClient'

type WithdrawalEntry = {
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
  pendingDebitsUsd: number
  totalWithdrawnUsd: number
  miningReadyUsd: number
  tradingReadyUsd: number
  referralReadyUsd: number
  walletOptions: {
    coinType: 'BTC' | 'ETH' | 'SOL' | 'USDT'
    address: string
  }[]
  entries: WithdrawalEntry[]
}

const COINS = ['USDT', 'BTC', 'ETH', 'SOL'] as const
const NETWORK_MAP: Record<(typeof COINS)[number], string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum (ERC-20)',
  USDT: 'USDT (ERC-20)',
  SOL: 'Solana',
}

export default function AccountWithdrawPageClient({
  balanceUsd,
  pendingCreditsUsd,
  pendingDebitsUsd,
  totalWithdrawnUsd,
  miningReadyUsd,
  tradingReadyUsd,
  referralReadyUsd,
  walletOptions,
  entries,
}: Props) {
  const [amountUsd, setAmountUsd] = useState('')
  const defaultCoin = useMemo(
    () => (walletOptions[0]?.coinType || 'USDT') as (typeof COINS)[number],
    [walletOptions]
  )
  const [coinType, setCoinType] = useState<(typeof COINS)[number]>(defaultCoin)
  const [customMethod, setCustomMethod] = useState(false)
  const [customMethodNote, setCustomMethodNote] = useState('')
  const [selectedWalletAddress, setSelectedWalletAddress] = useState(
    walletOptions.find(option => option.coinType === defaultCoin)?.address || ''
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState<{ type: 'idle' | 'error' | 'success'; message: string }>({
    type: 'idle',
    message: '',
  })

  const pendingRequests = useMemo(
    () => entries.filter(entry => entry.status === 'pending').length,
    [entries]
  )
  const availableCoins = useMemo(
    () => [...new Set(walletOptions.map(option => option.coinType))] as (typeof COINS)[number][],
    [walletOptions]
  )
  const walletsForSelectedCoin = useMemo(
    () => walletOptions.filter(option => option.coinType === coinType),
    [walletOptions, coinType]
  )
  const effectiveWalletAddress =
    walletsForSelectedCoin.find(option => option.address === selectedWalletAddress)?.address ||
    walletsForSelectedCoin[0]?.address ||
    ''

  const updateCoin = (nextCoin: (typeof COINS)[number]) => {
    setCoinType(nextCoin)
    const firstWallet = walletOptions.find(option => option.coinType === nextCoin)?.address || ''
    setSelectedWalletAddress(firstWallet)
  }

  const submit = async () => {
    const amount = Number(amountUsd)
    if (!Number.isFinite(amount) || amount < 10) {
      setStatus({ type: 'error', message: 'Enter a valid amount (minimum $10).' })
      return
    }
    if (!customMethod && !effectiveWalletAddress) {
      setStatus({ type: 'error', message: 'Set your wallet first in Settings > Wallet.' })
      return
    }
    if (customMethod && customMethodNote.trim().length < 12) {
      setStatus({ type: 'error', message: 'Provide details for your custom payout method.' })
      return
    }

    try {
      setIsSubmitting(true)
      setStatus({ type: 'idle', message: '' })

      const response = await fetch('/api/user/account-balance/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountUsd: amount,
          coinType,
          walletAddress: effectiveWalletAddress,
          customMethod,
          customMethodNote: customMethod ? customMethodNote.trim() : '',
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Unable to submit withdrawal request.')
      }

      setStatus({ type: 'success', message: 'Withdrawal request submitted. Awaiting admin approval.' })
      setAmountUsd('')
      setCustomMethod(false)
      setCustomMethodNote('')
      setTimeout(() => window.location.reload(), 900)
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to submit withdrawal request.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 lg:px-6 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white">Withdraw Funds</h1>
          <p className="text-white/70 mt-2">Request payouts from account balance to your preferred destination.</p>
        </div>
        <Link href="/dashboard" className="text-sm font-semibold text-white/85 underline underline-offset-4">
          Back to dashboard
        </Link>
      </div>

      {walletOptions.length === 0 && (
        <div
          className="p-5 rounded-2xl"
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
          }}
        >
          <div className="text-rose-100 font-semibold">No payout wallets configured.</div>
          <p className="text-sm text-rose-100/85 mt-2">
            Add your BTC, ETH, or USDT wallet in Settings before requesting withdrawals.
          </p>
          <Link href="/dashboard/settings/wallet" className="inline-block mt-3 text-sm text-white underline underline-offset-4">
            Open Wallet Settings {'>'}
          </Link>
        </div>
      )}

      {(miningReadyUsd > 0 || tradingReadyUsd > 0 || referralReadyUsd > 0) && (
        <div
          className="p-5 rounded-2xl"
          style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
          }}
        >
          <div className="text-emerald-100 font-semibold mb-2">Plan proceeds available for transfer</div>
          <p className="text-sm text-emerald-50/85">
            Move matured plan proceeds into account balance first. Once credited, request external withdrawals here.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {miningReadyUsd > 0 && (
              <Link
                href="/dashboard/earnings"
                className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#d1fae5',
                }}
              >
                Mining payout ready (${miningReadyUsd.toFixed(2)}) {'>'}
              </Link>
            )}
            {tradingReadyUsd > 0 && (
              <Link
                href="/dashboard/investment-trading/withdrawals"
                className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#d1fae5',
                }}
              >
                Trading payout ready (${tradingReadyUsd.toFixed(2)}) {'>'}
              </Link>
            )}
            {referralReadyUsd > 0 && (
              <Link
                href="/dashboard/referrals"
                className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#d1fae5',
                }}
              >
                Referral payout ready (${referralReadyUsd.toFixed(2)}) {'>'}
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div className="text-sm text-blue-100/80">Pending withdrawals</div>
          <div className="text-3xl font-bold text-blue-200 mt-1">
            ${pendingDebitsUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-blue-100/80 mt-2">{pendingRequests} request(s) awaiting review</div>
        </div>
        <div
          className="p-5 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.03))',
            border: '1px solid rgba(255, 255, 255, 0.22)',
          }}
        >
          <div className="text-sm text-white/75">Total withdrawn</div>
          <div className="text-3xl font-bold text-white mt-1">
            ${totalWithdrawnUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {pendingCreditsUsd > 0 && (
            <div className="text-xs text-emerald-100/75 mt-2">
              Pending credits: ${pendingCreditsUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          )}
        </div>
      </div>

      <div
        className="p-6 md:p-8 rounded-3xl space-y-5"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <h2 className="text-xl font-semibold text-white">Request external withdrawal</h2>

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
              placeholder="e.g. 250"
            />
          </div>
          <div>
            <label className="block text-sm text-white/80 mb-2">Payout coin</label>
            <select
              value={coinType}
              onChange={event => updateCoin(event.target.value as (typeof COINS)[number])}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
              disabled={walletOptions.length === 0}
            >
              {(availableCoins.length > 0 ? availableCoins : COINS).map(coin => (
                <option key={coin} value={coin} className="bg-zinc-900">
                  {coin}
                </option>
              ))}
            </select>
            <div className="text-xs text-white/55 mt-2">Network: {NETWORK_MAP[coinType]}</div>
          </div>
          <div>
            <label className="block text-sm text-white/80 mb-2">Destination wallet</label>
            <select
              value={effectiveWalletAddress}
              onChange={event => setSelectedWalletAddress(event.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
              disabled={customMethod || walletOptions.length === 0 || walletsForSelectedCoin.length === 0}
            >
              {walletsForSelectedCoin.length === 0 ? (
                <option value="" className="bg-zinc-900">No wallet configured for this coin</option>
              ) : (
                walletsForSelectedCoin.map(option => (
                  <option key={`${option.coinType}-${option.address}`} value={option.address} className="bg-zinc-900">
                    {option.coinType}: {option.address}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <div
          className="p-4 rounded-xl"
          style={{
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.24)',
          }}
        >
          <label className="flex items-center gap-2 text-sm text-blue-100">
            <input
              type="checkbox"
              checked={customMethod}
              onChange={event => setCustomMethod(event.target.checked)}
              className="h-4 w-4 rounded border-white/30 bg-white/10"
            />
            Request custom payout method through customer service
          </label>
          {customMethod && (
            <div className="mt-3 space-y-3">
              <textarea
                value={customMethodNote}
                onChange={event => setCustomMethodNote(event.target.value)}
                placeholder="Describe your preferred settlement method and required details."
                className="w-full min-h-24 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35"
              />
              <Link href="/dashboard/support" className="inline-block text-sm text-white underline underline-offset-4">
                Open Support Center {'>'}
              </Link>
            </div>
          )}
        </div>

        {status.type !== 'idle' && (
          <div className={`text-sm ${status.type === 'error' ? 'text-rose-300' : 'text-emerald-300'}`}>
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
          disabled={!customMethod && walletOptions.length === 0}
        >
          Submit withdrawal request
        </LoadingButton>
      </div>

      <LivePaymentsPageClient />

      <div
        className="p-6 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <h2 className="text-xl font-semibold text-white mb-4">Recent withdrawal requests</h2>
        {entries.length === 0 ? (
          <div className="text-sm text-white/65">No withdrawal requests yet.</div>
        ) : (
          <div className="space-y-2">
            {entries.slice(0, 25).map(entry => {
              const statusLabel =
                entry.status === 'settled' ? 'Approved' : entry.status === 'pending' ? 'Pending' : 'Rejected'
              const wallet = typeof entry.metadata?.walletAddress === 'string' ? entry.metadata.walletAddress : null
              const coin = typeof entry.metadata?.coinType === 'string' ? entry.metadata.coinType : 'N/A'

              return (
                <div key={entry.id} className="rounded-xl border border-white/10 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm text-white/90">
                      {coin} payout
                      {wallet ? <span className="text-white/60"> - {wallet.slice(0, 8)}...{wallet.slice(-6)}</span> : null}
                    </div>
                    <div className="text-sm font-semibold text-rose-300">
                      -$
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
    </div>
  )
}
