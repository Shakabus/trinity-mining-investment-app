'use client'

import { useMemo, useState } from 'react'
import LoadingButton from '@/components/ui/LoadingButton'
import { useCurrency } from '@/components/currency/CurrencyProvider'

type WalletFlowItem = {
  coinType: 'BTC' | 'ETH' | 'SOL' | 'USDT'
  netCrypto: number
  netUsd: number
}

type Props = {
  walletFlow: WalletFlowItem[]
}

const COINS: WalletFlowItem['coinType'][] = ['BTC', 'ETH', 'SOL', 'USDT']

export default function WalletConversionCard({ walletFlow }: Props) {
  const [fromCoin, setFromCoin] = useState<WalletFlowItem['coinType']>('BTC')
  const [toCoin, setToCoin] = useState<WalletFlowItem['coinType']>('ETH')
  const [amountUsd, setAmountUsd] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState<{ type: 'idle' | 'error' | 'success'; message: string }>({
    type: 'idle',
    message: '',
  })
  const { currency, rates, format, convert } = useCurrency()
  const displayRate = rates[currency] > 0 ? rates[currency] : 1

  const walletMap = useMemo(() => {
    return walletFlow.reduce<Record<WalletFlowItem['coinType'], WalletFlowItem>>((map, item) => {
      map[item.coinType] = item
      return map
    }, {} as Record<WalletFlowItem['coinType'], WalletFlowItem>)
  }, [walletFlow])

  const availableFromUsd = Math.max(0, walletMap[fromCoin]?.netUsd ?? 0)

  const setMax = () => {
    setAmountUsd(availableFromUsd > 0 ? convert(availableFromUsd).toFixed(2) : '')
  }

  const submit = async () => {
    const amountDisplay = Number(amountUsd)
    const amountUsdValue = amountDisplay / displayRate
    if (!Number.isFinite(amountDisplay) || amountUsdValue <= 0) {
      setStatus({ type: 'error', message: `Enter a valid ${currency} amount.` })
      return
    }
    if (fromCoin === toCoin) {
      setStatus({ type: 'error', message: 'Choose two different currencies.' })
      return
    }
    if (amountUsdValue > availableFromUsd) {
      setStatus({
        type: 'error',
        message: `Amount exceeds available ${fromCoin} wallet value (${format(availableFromUsd)}).`,
      })
      return
    }

    try {
      setIsSubmitting(true)
      setStatus({ type: 'idle', message: '' })

      const response = await fetch('/api/user/account-balance/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromCoin, toCoin, amountUsd: amountUsdValue }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'Conversion failed.')
      }

      setStatus({
        type: 'success',
        message: `Converted ${format(amountUsdValue)} from ${fromCoin} to ${toCoin}.`,
      })
      setAmountUsd('')
      setTimeout(() => window.location.reload(), 800)
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Conversion failed.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="p-6 md:p-8 rounded-3xl space-y-4"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div>
        <h2 className="text-xl font-semibold text-white">Convert Wallet Assets</h2>
        <p className="text-sm text-white/70 mt-1">
          Move value between your BTC, ETH, SOL, and USDT system wallets using live market rates.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm text-white/80 mb-2">From</label>
          <select
            value={fromCoin}
            onChange={event => setFromCoin(event.target.value as WalletFlowItem['coinType'])}
            className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
          >
            {COINS.map(coin => (
              <option key={coin} value={coin} className="bg-zinc-900">
                {coin}
              </option>
            ))}
          </select>
          <div className="text-xs text-white/60 mt-2">Available: {format(availableFromUsd)}</div>
        </div>
        <div>
          <label className="block text-sm text-white/80 mb-2">To</label>
          <select
            value={toCoin}
            onChange={event => setToCoin(event.target.value as WalletFlowItem['coinType'])}
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
          <label className="block text-sm text-white/80 mb-2">Amount ({currency})</label>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              step="0.01"
              value={amountUsd}
              onChange={event => setAmountUsd(event.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
              placeholder="e.g. 500"
            />
            <button
              type="button"
              onClick={setMax}
              className="px-3 rounded-lg border border-white/20 text-white/85 hover:bg-white/10 transition-colors"
            >
              Max
            </button>
          </div>
        </div>
      </div>

      {status.type !== 'idle' && (
        <div className={`text-sm ${status.type === 'error' ? 'text-rose-300' : 'text-emerald-300'}`}>
          {status.message}
        </div>
      )}

      <LoadingButton
        onClick={submit}
        isLoading={isSubmitting}
        loadingText="Converting..."
        className="px-6 py-3 rounded-full font-semibold"
        style={{
          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          color: '#ffffff',
        }}
      >
        Convert Now
      </LoadingButton>
    </div>
  )
}
