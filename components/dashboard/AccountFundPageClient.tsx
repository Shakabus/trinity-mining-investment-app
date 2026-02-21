'use client'

import { type CSSProperties, useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, Copy } from 'lucide-react'
import LoadingButton from '@/components/ui/LoadingButton'
import LivePaymentsPageClient from '@/components/marketing/LivePaymentsPageClient'
import WalletConversionCard from '@/components/dashboard/WalletConversionCard'
import { useCurrency } from '@/components/currency/CurrencyProvider'
import { FUNDING_COINS, SYSTEM_FUNDING_WALLETS, type FundingCoin } from '@/lib/system-funding-wallets'

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
  spendableBalanceUsd: number
  withdrawableEarningsUsd: number
  pendingCreditsUsd: number
  pendingDebitsUsd: number
  pendingWithdrawalsUsd: number
  totalDepositedUsd: number
  totalInvestedUsd: number
  totalWithdrawnUsd: number
  totalEarnedUsd: number
  walletFlow: {
    coinType: 'BTC' | 'ETH' | 'SOL' | 'USDT'
    totalInCrypto: number
    totalOutCrypto: number
    netCrypto: number
    totalInUsd: number
    totalOutUsd: number
    netUsd: number
  }[]
  entries: BalanceEntry[]
  freezeState: {
    incomingLocked: boolean
    outgoingLocked: boolean
    spendableLocked: boolean
    withdrawableLocked: boolean
    earningsLocked: boolean
    walletsLocked: boolean
  }
}

type FundingMethod = 'crypto_transfer' | 'card_provider'

const COINS = FUNDING_COINS

const CARD_PROVIDERS = [
  {
    id: 'moonpay',
    name: 'MoonPay',
    description: 'Buy crypto with bank card and then fund your account wallet.',
  },
  {
    id: 'transak',
    name: 'Transak',
    description: 'Alternative card on-ramp provider for crypto purchases.',
  },
  {
    id: 'banxa',
    name: 'Banxa',
    description: 'Additional card checkout option for supported regions.',
  },
] as const

const sourceLabel: Record<string, string> = {
  funding_deposit: 'Account funding',
  mining_plan_purchase: 'Mining plan purchase',
  trading_plan_purchase: 'Trading plan purchase',
  real_estate_buy_in: 'Real estate buy-in',
  real_estate_withdrawal: 'Real estate withdrawal',
  wallet_conversion: 'Wallet conversion',
  mining_withdrawal: 'Mining withdrawal',
  trading_withdrawal: 'Trading withdrawal',
  referral_withdrawal: 'Referral withdrawal',
  external_payment: 'Approved mining payment',
  external_trading_payment: 'Approved trading payment',
  admin_manual_adjustment: 'Manual adjustment',
  withdrawal_reversal: 'Withdrawal reversal',
  account_balance_withdrawal: 'Account withdrawal',
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

export default function AccountFundPageClient({
  spendableBalanceUsd,
  withdrawableEarningsUsd,
  pendingCreditsUsd,
  pendingDebitsUsd,
  pendingWithdrawalsUsd,
  totalDepositedUsd,
  totalInvestedUsd,
  totalWithdrawnUsd,
  totalEarnedUsd,
  walletFlow,
  entries,
  freezeState,
}: Props) {
  const [amountUsd, setAmountUsd] = useState('')
  const [fundingMethod, setFundingMethod] = useState<FundingMethod>('crypto_transfer')
  const [coinType, setCoinType] = useState<FundingCoin>('USDT')
  const [txid, setTxid] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [launchingProvider, setLaunchingProvider] = useState<(typeof CARD_PROVIDERS)[number]['id'] | null>(null)
  const [status, setStatus] = useState<{ type: 'idle' | 'error' | 'success'; message: string }>({
    type: 'idle',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { currency, rates, format } = useCurrency()
  const displayRate = rates[currency] > 0 ? rates[currency] : 1

  const pendingFunding = useMemo(
    () => entries.filter(entry => entry.source === 'funding_deposit' && entry.status === 'pending'),
    [entries]
  )
  const fundingLocked = freezeState.incomingLocked
  const walletFundsLocked = freezeState.walletsLocked
  const walletAddress = SYSTEM_FUNDING_WALLETS[coinType]

  const copyAddress = async () => {
    await navigator.clipboard.writeText(walletAddress)
    setCopiedAddress(true)
    setTimeout(() => setCopiedAddress(false), 1500)
  }

  const launchCardCheckout = async (providerId: (typeof CARD_PROVIDERS)[number]['id']) => {
    if (fundingLocked) {
      setStatus({ type: 'error', message: 'Funding is frozen for this account.' })
      return
    }
    const amountDisplay = Number(amountUsd)
    const amountUsdValue = amountDisplay / displayRate
    if (!Number.isFinite(amountDisplay) || amountUsdValue < 20) {
      setStatus({
        type: 'error',
        message: `Enter at least ${format(20)} before launching card checkout.`,
      })
      return
    }

    const popup = window.open('', '_blank', 'noopener,noreferrer')
    if (!popup) {
      setStatus({
        type: 'error',
        message: 'Popup blocked by browser. Allow popups for this site and try again.',
      })
      return
    }

    popup.document.write('<p style="font-family: sans-serif; padding: 16px;">Opening secure checkout...</p>')

    try {
      setLaunchingProvider(providerId)
      const response = await fetch('/api/user/account-balance/card-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerId,
          amountUsd: amountUsdValue,
          coinType,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.checkoutUrl) {
        throw new Error(payload?.error || 'Unable to launch card checkout.')
      }

      popup.location.href = payload.checkoutUrl
      setStatus({
        type: 'success',
        message: 'Card checkout opened in a new tab. Complete payment, then return to submit proof if needed.',
      })
    } catch (error) {
      popup.close()
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to launch card checkout.',
      })
    } finally {
      setLaunchingProvider(null)
    }
  }

  const submit = async () => {
    if (fundingLocked) {
      setStatus({ type: 'error', message: 'Funding is frozen for this account.' })
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
      formData.append('amountUsd', String(amountUsdValue))
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

      setStatus({ type: 'success', message: 'Funding request submitted. Awaiting review.' })
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
          <p className="text-white/70 mt-2">Submit funding proof. Balance updates after review.</p>
        </div>
        <Link href="/dashboard" className="text-sm font-semibold text-white/85 underline underline-offset-4">
          Back to dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div
          className="p-5 rounded-2xl relative"
          style={applyFrozenStyle({
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.16), rgba(16, 185, 129, 0.04))',
            border: '1px solid rgba(16, 185, 129, 0.35)',
          }, freezeState.spendableLocked)}
        >
          {freezeState.spendableLocked ? <FrozenTag /> : null}
          <div className="text-sm text-emerald-100/80">Spendable for plans</div>
          <div className="text-3xl font-bold text-emerald-200 mt-1">
            {format(spendableBalanceUsd)}
          </div>
          <div className="text-xs text-emerald-100/75 mt-2">Deposits only</div>
        </div>
        <div
          className="p-5 rounded-2xl relative"
          style={applyFrozenStyle({
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.16), rgba(168, 85, 247, 0.04))',
            border: '1px solid rgba(168, 85, 247, 0.35)',
          }, freezeState.withdrawableLocked)}
        >
          {freezeState.withdrawableLocked ? <FrozenTag /> : null}
          <div className="text-sm text-violet-100/80">Withdrawable earnings</div>
          <div className="text-3xl font-bold text-violet-200 mt-1">
            {format(withdrawableEarningsUsd)}
          </div>
          <div className="text-xs text-violet-100/75 mt-2">External withdrawals only</div>
        </div>
        <div
          className="p-5 rounded-2xl relative"
          style={applyFrozenStyle({
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.16), rgba(59, 130, 246, 0.04))',
            border: '1px solid rgba(59, 130, 246, 0.35)',
          }, fundingLocked)}
        >
          {fundingLocked ? <FrozenTag /> : null}
          <div className="text-sm text-blue-100/80">Total deposited</div>
          <div className="text-3xl font-bold text-blue-200 mt-1">{format(totalDepositedUsd)}</div>
          <div className="text-xs text-blue-100/75 mt-2">Approved account funding</div>
        </div>
        <div
          className="p-5 rounded-2xl relative"
          style={applyFrozenStyle({
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(245, 158, 11, 0.04))',
            border: '1px solid rgba(245, 158, 11, 0.35)',
          }, freezeState.spendableLocked)}
        >
          {freezeState.spendableLocked ? <FrozenTag /> : null}
          <div className="text-sm text-amber-100/80">Total invested</div>
          <div className="text-3xl font-bold text-amber-200 mt-1">{format(totalInvestedUsd)}</div>
          <div className="text-xs text-amber-100/75 mt-2">Plan and property purchases</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="text-xs text-white/70 rounded-xl border border-white/10 px-3 py-2">
          Total earned credited: <span className="text-white font-semibold">{format(totalEarnedUsd)}</span>
        </div>
        <div className="text-xs text-white/70 rounded-xl border border-white/10 px-3 py-2">
          Total withdrawn: <span className="text-white font-semibold">{format(totalWithdrawnUsd)}</span>
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
        className="p-6 rounded-3xl space-y-4 relative"
        style={applyFrozenStyle({
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          backdropFilter: 'blur(20px)',
        }, fundingLocked)}
      >
        {fundingLocked ? <FrozenTag /> : null}
        <h2 className="text-xl font-semibold text-white">Funding options</h2>
        {fundingLocked ? (
          <p className="text-xs text-white/70">Funding actions are currently frozen.</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFundingMethod('crypto_transfer')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              fundingMethod === 'crypto_transfer'
                ? 'bg-white text-black'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
            disabled={fundingLocked}
          >
            Crypto transfer (default)
          </button>
          <button
            type="button"
            onClick={() => setFundingMethod('card_provider')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              fundingMethod === 'card_provider'
                ? 'bg-white text-black'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
            disabled={fundingLocked}
          >
            Card providers (optional)
          </button>
        </div>

        {fundingMethod === 'card_provider' && (
          <div className="rounded-2xl border border-white/10 p-4 space-y-3">
            <p className="text-sm text-white/80">
              Card checkout is optional. You can use any provider below, then return and submit funding proof
              for review.
            </p>
            {status.type !== 'idle' && (
              <div className={`text-sm ${status.type === 'error' ? 'text-red-300' : 'text-emerald-300'}`}>
                {status.message}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {CARD_PROVIDERS.map(provider => (
                <div key={provider.id} className="rounded-xl border border-white/10 p-3">
                  <div className="text-sm font-semibold text-white">{provider.name}</div>
                  <p className="text-xs text-white/65 mt-1">{provider.description}</p>
                  <LoadingButton
                    onClick={() => launchCardCheckout(provider.id)}
                    isLoading={launchingProvider === provider.id}
                    loadingText="Opening..."
                    disabled={fundingLocked}
                    className="mt-3 px-3 py-2 rounded-lg text-xs font-semibold"
                    style={{
                      background: 'linear-gradient(135deg, #582dff, #3a137a)',
                      color: '#ffffff',
                    }}
                  >
                    Open checkout
                  </LoadingButton>
                </div>
              ))}
            </div>
            <p className="text-xs text-white/60">
              The current default flow remains direct wallet transfer and proof submission.
            </p>
          </div>
        )}
      </div>

      <div
        className="p-6 md:p-8 rounded-3xl space-y-4 relative"
        style={applyFrozenStyle({
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          backdropFilter: 'blur(20px)',
        }, fundingLocked)}
      >
        {fundingLocked ? <FrozenTag /> : null}
        <h2 className="text-xl font-semibold text-white">Submit account funding proof</h2>
        {fundingLocked ? (
          <p className="text-xs text-white/70">Incoming funds are frozen for this account.</p>
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
              placeholder="e.g. 500"
              disabled={fundingLocked}
            />
          </div>
          <div>
            <label className="block text-sm text-white/80 mb-2">Coin</label>
            <select
              value={coinType}
              onChange={event => setCoinType(event.target.value as FundingCoin)}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
              disabled={fundingLocked}
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
              disabled={fundingLocked}
            />
          </div>
        </div>

        <div
          className="p-4 rounded-xl"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}
        >
          <div className="text-sm text-white/80 mb-2">Send {coinType} to this address</div>
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs md:text-sm text-white break-all font-mono">{walletAddress}</div>
            <button
              type="button"
              onClick={copyAddress}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/15 transition-colors flex-shrink-0"
              aria-label="Copy wallet address"
              disabled={fundingLocked}
            >
              {copiedAddress ? <Check size={16} className="text-emerald-300" /> : <Copy size={16} className="text-white/75" />}
            </button>
          </div>
          <div className="text-xs text-white/55 mt-2">
            Network:{' '}
            {coinType === 'USDT'
              ? 'ERC-20 (Ethereum)'
              : coinType === 'ETH'
              ? 'Ethereum'
              : coinType === 'SOL'
              ? 'Solana'
              : 'Bitcoin'}
          </div>
        </div>

        <div>
          <label className="block text-sm text-white/80 mb-2">Proof upload (image or PDF)</label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={event => setProofFile(event.target.files?.[0] || null)}
            className="w-full text-sm text-white/70"
            disabled={fundingLocked}
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
          disabled={fundingLocked}
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
        className="p-6 rounded-3xl relative"
        style={applyFrozenStyle({
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          backdropFilter: 'blur(20px)',
        }, walletFundsLocked)}
      >
        {walletFundsLocked ? <FrozenTag /> : null}
        <h2 className="text-xl font-semibold text-white mb-4">Payment Wallet Balances</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {walletFlow.map(item => (
            <div key={item.coinType} className="rounded-xl border border-white/10 p-4">
              <div className="text-xs text-white/70">{item.coinType} wallet</div>
              <div className="text-base font-semibold text-white mt-1">
                {item.netCrypto.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 8,
                })}{' '}
                {item.coinType}
              </div>
              <div className="text-xs text-white/60 mt-1">
                Value: {format(item.netUsd)}
              </div>
              <div className="text-[11px] text-emerald-200/85 mt-2">
                In: +{item.totalInCrypto.toFixed(8)} {item.coinType}
              </div>
              <div className="text-[11px] text-rose-200/85">
                Out: -{item.totalOutCrypto.toFixed(8)} {item.coinType}
              </div>
            </div>
          ))}
        </div>
      </div>

      <WalletConversionCard walletFlow={walletFlow} isFrozen={walletFundsLocked} />

      <div
        className="p-6 rounded-3xl"
        style={{
          background: 'rgba(59, 130, 246, 0.12)',
          border: '1px solid rgba(59, 130, 246, 0.28)',
        }}
      >
        <div className="flex gap-3 items-start">
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

      <LivePaymentsPageClient />

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
                      {isCredit ? '+' : '-'}{format(entry.amountUsd)}
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
