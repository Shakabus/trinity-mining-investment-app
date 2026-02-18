'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, Copy } from 'lucide-react'
import LoadingButton from '@/components/ui/LoadingButton'
import LivePaymentsPageClient from '@/components/marketing/LivePaymentsPageClient'
import WalletConversionCard from '@/components/dashboard/WalletConversionCard'

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
  pendingDebitsUsd: number
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
}

type FundingMethod = 'crypto_transfer' | 'card_provider'

const COINS = ['USDT', 'BTC', 'ETH', 'SOL'] as const
const WALLET_ADDRESSES: Record<(typeof COINS)[number], string> = {
  BTC: 'bc1q76ztuupz9sycs3hf0l8q0t3mt5j78rxr29cwv4',
  ETH: '0x8610A9E40FAD02Ce4157FbbFb38752aBE1264334',
  USDT: '0x8610A9E40FAD02Ce4157FbbFb38752aBE1264334',
  SOL: '54fnCmk1gLDhtzDcd8xt7ar4YKKu9sJqqwyXNoDZMpw8',
}

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
    id: 'stripe',
    name: 'Stripe Crypto',
    description: 'Card-based crypto purchase option (availability varies by region).',
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

export default function AccountFundPageClient({
  balanceUsd,
  pendingCreditsUsd,
  pendingDebitsUsd,
  walletFlow,
  entries,
}: Props) {
  const [amountUsd, setAmountUsd] = useState('')
  const [fundingMethod, setFundingMethod] = useState<FundingMethod>('crypto_transfer')
  const [coinType, setCoinType] = useState<(typeof COINS)[number]>('USDT')
  const [txid, setTxid] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [status, setStatus] = useState<{ type: 'idle' | 'error' | 'success'; message: string }>({
    type: 'idle',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const pendingFunding = useMemo(
    () => entries.filter(entry => entry.source === 'funding_deposit' && entry.status === 'pending'),
    [entries]
  )
  const walletAddress = WALLET_ADDRESSES[coinType]

  const copyAddress = async () => {
    await navigator.clipboard.writeText(walletAddress)
    setCopiedAddress(true)
    setTimeout(() => setCopiedAddress(false), 1500)
  }

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
          {pendingDebitsUsd > 0 && (
            <div className="text-xs text-amber-100/85 mt-2">
              Pending debits: ${pendingDebitsUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          )}
        </div>
      </div>

      <div
        className="p-6 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          backdropFilter: 'blur(20px)',
        }}
      >
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
                Value: $
                {item.netUsd.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
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

      <WalletConversionCard walletFlow={walletFlow} />

      <div
        className="p-6 rounded-3xl space-y-4"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <h2 className="text-xl font-semibold text-white">Funding options</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFundingMethod('crypto_transfer')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              fundingMethod === 'crypto_transfer'
                ? 'bg-white text-black'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {CARD_PROVIDERS.map(provider => (
                <div key={provider.id} className="rounded-xl border border-white/10 p-3">
                  <div className="text-sm font-semibold text-white">{provider.name}</div>
                  <p className="text-xs text-white/65 mt-1">{provider.description}</p>
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
