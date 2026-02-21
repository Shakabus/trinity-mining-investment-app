'use client'

import { type CSSProperties, useMemo, useState } from 'react'
import Link from 'next/link'
import LoadingButton from '@/components/ui/LoadingButton'
import LivePaymentsPageClient from '@/components/marketing/LivePaymentsPageClient'
import WalletConversionCard from '@/components/dashboard/WalletConversionCard'
import { useCurrency } from '@/components/currency/CurrencyProvider'

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
  spendableBalanceUsd: number
  withdrawableEarningsUsd: number
  pendingCreditsUsd: number
  pendingDebitsUsd: number
  pendingWithdrawalsUsd: number
  walletFlow: {
    coinType: 'BTC' | 'ETH' | 'SOL' | 'USDT'
    totalInCrypto: number
    totalOutCrypto: number
    netCrypto: number
    totalInUsd: number
    totalOutUsd: number
    netUsd: number
  }[]
  totalWithdrawnUsd: number
  totalDepositedUsd: number
  totalInvestedUsd: number
  totalEarnedUsd: number
  showProceedsAlert: boolean
  proceedsAlertMarker: string | null
  miningReadyUsd: number
  tradingReadyUsd: number
  referralReadyUsd: number
  realEstateReadyUsd: number
  walletOptions: {
    coinType: 'BTC' | 'ETH' | 'SOL' | 'USDT'
    address: string
  }[]
  entries: WithdrawalEntry[]
  kycStatus: 'not_submitted' | 'pending' | 'approved' | 'rejected' | string
  freezeState: {
    incomingLocked: boolean
    outgoingLocked: boolean
    spendableLocked: boolean
    withdrawableLocked: boolean
    earningsLocked: boolean
    walletsLocked: boolean
  }
}

const COINS = ['USDT', 'BTC', 'ETH', 'SOL'] as const
const NETWORK_MAP: Record<(typeof COINS)[number], string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  USDT: 'USDT (ERC-20)',
  SOL: 'Solana',
}

const applyFrozenStyle = (base: CSSProperties, frozen: boolean): CSSProperties => {
  if (!frozen) return base
  return {
    ...base,
    filter: 'grayscale(1)',
    opacity: 0.58,
  }
}

function FrozenTag() {
  return (
    <span
      className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase"
      style={{
        background: 'rgba(156, 163, 175, 0.24)',
        border: '1px solid rgba(156, 163, 175, 0.45)',
        color: '#e5e7eb',
      }}
    >
      Frozen
    </span>
  )
}

export default function AccountWithdrawPageClient({
  spendableBalanceUsd,
  withdrawableEarningsUsd,
  pendingCreditsUsd,
  pendingDebitsUsd,
  pendingWithdrawalsUsd,
  walletFlow,
  totalWithdrawnUsd,
  totalDepositedUsd,
  totalInvestedUsd,
  totalEarnedUsd,
  showProceedsAlert,
  proceedsAlertMarker,
  miningReadyUsd,
  tradingReadyUsd,
  referralReadyUsd,
  realEstateReadyUsd,
  walletOptions,
  entries,
  kycStatus,
  freezeState,
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
  const { currency, rates, format } = useCurrency()
  const displayRate = rates[currency] > 0 ? rates[currency] : 1
  const isKycApproved = kycStatus === 'approved'
  const isKycSystemUnavailable = kycStatus === 'system_unavailable'
  const withdrawActionLocked = freezeState.withdrawableLocked || freezeState.walletsLocked
  const dismissProceedsAlertHref = (nextPath: string) => {
    if (!proceedsAlertMarker) return nextPath
    return `/api/user/plan-proceeds-alert/dismiss?next=${encodeURIComponent(nextPath)}&marker=${encodeURIComponent(proceedsAlertMarker)}`
  }

  const pendingRequests = useMemo(
    () => entries.filter(entry => entry.status === 'pending').length,
    [entries]
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
    if (withdrawActionLocked) {
      setStatus({
        type: 'error',
        message: 'Withdrawals are frozen for this account.',
      })
      return
    }
    if (!isKycApproved) {
      setStatus({
        type: 'error',
        message: isKycSystemUnavailable
          ? 'KYC service is temporarily unavailable. Please try again shortly.'
          : 'Complete KYC verification and wait for approval before requesting withdrawals.',
      })
      return
    }
    const amountDisplay = Number(amountUsd)
    const amountUsdValue = amountDisplay / displayRate
    if (!Number.isFinite(amountDisplay) || amountUsdValue < 10) {
      setStatus({
        type: 'error',
        message: `Enter a valid amount (minimum ${format(10)}).`,
      })
      return
    }
    if (amountUsdValue > withdrawableEarningsUsd) {
      setStatus({
        type: 'error',
        message: `Amount exceeds withdrawable earnings (${format(withdrawableEarningsUsd)}).`,
      })
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
          amountUsd: amountUsdValue,
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

      setStatus({ type: 'success', message: 'Withdrawal request submitted. Awaiting review.' })
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
            Add your BTC, ETH, USDT, or SOL wallet in Settings before requesting withdrawals.
          </p>
          <Link href="/dashboard/settings/wallet" className="inline-block mt-3 text-sm text-white underline underline-offset-4">
            Open Wallet Settings {'>'}
          </Link>
        </div>
      )}

      {showProceedsAlert &&
        (miningReadyUsd > 0 || tradingReadyUsd > 0 || referralReadyUsd > 0 || realEstateReadyUsd > 0) && (
        <div
          className="p-5 rounded-2xl relative"
          style={applyFrozenStyle({
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
          }, freezeState.earningsLocked)}
        >
          {freezeState.earningsLocked ? <FrozenTag /> : null}
          <div className="text-emerald-100 font-semibold mb-2">Plan proceeds available for transfer</div>
          <p className="text-sm text-emerald-50/85">
            Move matured plan proceeds into account balance first. Once credited, request external withdrawals here.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {miningReadyUsd > 0 && (
              <Link
                href={dismissProceedsAlertHref('/dashboard/earnings')}
                className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#d1fae5',
                }}
              >
                Mining payout ready ({format(miningReadyUsd)}) {'>'}
              </Link>
            )}
            {tradingReadyUsd > 0 && (
              <Link
                href={dismissProceedsAlertHref('/dashboard/investment-trading/withdrawals')}
                className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#d1fae5',
                }}
              >
                Trading payout ready ({format(tradingReadyUsd)}) {'>'}
              </Link>
            )}
            {referralReadyUsd > 0 && (
              <Link
                href={dismissProceedsAlertHref('/dashboard/referrals')}
                className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#d1fae5',
                }}
              >
                Referral payout ready ({format(referralReadyUsd)}) {'>'}
              </Link>
            )}
            {realEstateReadyUsd > 0 && (
              <Link
                href={dismissProceedsAlertHref('/dashboard/real-estate/withdrawals')}
                className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#d1fae5',
                }}
              >
                Real-estate payout ready ({format(realEstateReadyUsd)}) {'>'}
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div
          className="p-5 rounded-2xl relative"
          style={applyFrozenStyle({
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.16), rgba(16, 185, 129, 0.04))',
            border: '1px solid rgba(16, 185, 129, 0.35)',
          }, freezeState.withdrawableLocked)}
        >
          {freezeState.withdrawableLocked ? <FrozenTag /> : null}
          <div className="text-sm text-emerald-100/80">Withdrawable earnings</div>
          <div className="text-3xl font-bold text-emerald-200 mt-1">
            {format(withdrawableEarningsUsd)}
          </div>
          <div className="text-xs text-emerald-100/75 mt-2">Only earnings can be withdrawn</div>
        </div>
        <div
          className="p-5 rounded-2xl relative"
          style={applyFrozenStyle({
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.16), rgba(59, 130, 246, 0.04))',
            border: '1px solid rgba(59, 130, 246, 0.35)',
          }, freezeState.spendableLocked)}
        >
          {freezeState.spendableLocked ? <FrozenTag /> : null}
          <div className="text-sm text-blue-100/80">Spendable for plans</div>
          <div className="text-3xl font-bold text-blue-200 mt-1">
            {format(spendableBalanceUsd)}
          </div>
          <div className="text-xs text-blue-100/80 mt-2">Deposits and principal only</div>
        </div>
        <div
          className="p-5 rounded-2xl relative"
          style={applyFrozenStyle({
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.03))',
            border: '1px solid rgba(255, 255, 255, 0.22)',
          }, freezeState.earningsLocked)}
        >
          {freezeState.earningsLocked ? <FrozenTag /> : null}
          <div className="text-sm text-white/75">Total earned credited</div>
          <div className="text-3xl font-bold text-white mt-1">{format(totalEarnedUsd)}</div>
          <div className="text-xs text-white/70 mt-2">From mining, trading, referral, and real estate</div>
        </div>
        <div
          className="p-5 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.16), rgba(244, 63, 94, 0.04))',
            border: '1px solid rgba(244, 63, 94, 0.35)',
          }}
        >
          <div className="text-sm text-rose-100/80">Total withdrawn</div>
          <div className="text-3xl font-bold text-white mt-1">
            {format(totalWithdrawnUsd)}
          </div>
          <div className="text-xs text-rose-100/75 mt-2">{pendingRequests} request(s) awaiting review</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="text-xs text-white/70 rounded-xl border border-white/10 px-3 py-2">
          Total deposited: <span className="text-white font-semibold">{format(totalDepositedUsd)}</span>
        </div>
        <div className="text-xs text-white/70 rounded-xl border border-white/10 px-3 py-2">
          Total invested: <span className="text-white font-semibold">{format(totalInvestedUsd)}</span>
        </div>
        {pendingCreditsUsd > 0 && (
          <div className="text-xs text-emerald-100/80 rounded-xl border border-emerald-400/20 px-3 py-2">
            Pending credits: {format(pendingCreditsUsd)}
          </div>
        )}
        {pendingDebitsUsd > 0 && (
          <div className="text-xs text-amber-100/80 rounded-xl border border-amber-400/20 px-3 py-2">
            Pending purchase debits: {format(Math.max(0, pendingDebitsUsd - pendingWithdrawalsUsd))}
          </div>
        )}
        {pendingWithdrawalsUsd > 0 && (
          <div className="text-xs text-rose-100/80 rounded-xl border border-rose-400/20 px-3 py-2">
            Pending external withdrawals: {format(pendingWithdrawalsUsd)}
          </div>
        )}
      </div>

      <div
        className="p-6 md:p-8 rounded-3xl space-y-5 relative"
        style={applyFrozenStyle({
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          backdropFilter: 'blur(20px)',
        }, withdrawActionLocked)}
      >
        {withdrawActionLocked ? <FrozenTag /> : null}
        <h2 className="text-xl font-semibold text-white">Request external withdrawal</h2>
        {withdrawActionLocked ? (
          <p className="text-xs text-white/70">Withdrawals are currently frozen.</p>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-white/80 mb-2">Amount ({currency})</label>
            <input
              type="number"
              min={10}
              step="0.01"
              value={amountUsd}
              onChange={event => setAmountUsd(event.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
              placeholder="e.g. 250"
              disabled={withdrawActionLocked}
            />
          </div>
          <div>
            <label className="block text-sm text-white/80 mb-2">Payout coin</label>
            <select
              value={coinType}
              onChange={event => updateCoin(event.target.value as (typeof COINS)[number])}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
              disabled={withdrawActionLocked}
            >
              {COINS.map(coin => (
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
              disabled={
                withdrawActionLocked ||
                customMethod ||
                walletOptions.length === 0 ||
                walletsForSelectedCoin.length === 0
              }
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
              disabled={withdrawActionLocked}
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
                disabled={withdrawActionLocked}
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
          disabled={
            withdrawActionLocked ||
            !isKycApproved ||
            (!customMethod && walletOptions.length === 0)
          }
        >
          Submit withdrawal request
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
                      -{format(entry.amountUsd)}
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

      <WalletConversionCard walletFlow={walletFlow} isFrozen={freezeState.walletsLocked} />

      <LivePaymentsPageClient />
    </div>
  )
}
