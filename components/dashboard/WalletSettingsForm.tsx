'use client'

import { useState } from 'react'
import LoadingButton from '@/components/ui/LoadingButton'

interface WalletSettingsFormProps {
  btcAddress: string
  ethAddress: string
  ltcAddress: string
  usdtAddress: string
  solAddress: string
}

export default function WalletSettingsForm({
  btcAddress,
  ethAddress,
  ltcAddress,
  usdtAddress,
  solAddress,
}: WalletSettingsFormProps) {
  const [btcValue, setBtcValue] = useState(btcAddress)
  const [ethValue, setEthValue] = useState(ethAddress)
  const [ltcValue, setLtcValue] = useState(ltcAddress)
  const [usdtValue, setUsdtValue] = useState(usdtAddress)
  const [solValue, setSolValue] = useState(solAddress)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const validateAddress = (label: string, value: string) => {
    if (!value) return null
    const trimmed = value.trim()
    const btcRegex = /^(bc1)[0-9a-z]{25,59}$|^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/i
    const ethRegex = /^0x[a-fA-F0-9]{40}$/
    const ltcRegex = /^(ltc1)[0-9a-z]{26,59}$|^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$/i
    const usdtRegex = /^0x[a-fA-F0-9]{40}$|^T[1-9A-HJ-NP-Za-km-z]{33}$/
    const solRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

    if (label === 'BTC' && !btcRegex.test(trimmed)) {
      return 'BTC address format is invalid.'
    }
    if (label === 'ETH' && !ethRegex.test(trimmed)) {
      return 'ETH address format is invalid.'
    }
    if (label === 'LTC' && !ltcRegex.test(trimmed)) {
      return 'LTC address format is invalid.'
    }
    if (label === 'USDT' && !usdtRegex.test(trimmed)) {
      return 'USDT address format is invalid.'
    }
    if (label === 'SOL' && !solRegex.test(trimmed)) {
      return 'SOL address format is invalid.'
    }
    return null
  }

  const handleSubmit = async () => {
    const trimmedBtc = btcValue.trim()
    const trimmedEth = ethValue.trim()
    const trimmedLtc = ltcValue.trim()
    const trimmedUsdt = usdtValue.trim()
    const trimmedSol = solValue.trim()

    const btcError = validateAddress('BTC', trimmedBtc)
    const ethError = validateAddress('ETH', trimmedEth)
    const ltcError = validateAddress('LTC', trimmedLtc)
    const usdtError = validateAddress('USDT', trimmedUsdt)
    const solError = validateAddress('SOL', trimmedSol)

    if (btcError || ethError || ltcError || usdtError || solError) {
      setStatus({
        type: 'error',
        message: btcError || ethError || ltcError || usdtError || solError || 'Invalid wallet address.',
      })
      return
    }

    setIsSaving(true)
    setStatus(null)

    try {
      const response = await fetch('/api/user/update-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          btcAddress: trimmedBtc,
          ethAddress: trimmedEth,
          ltcAddress: trimmedLtc,
          usdtAddress: trimmedUsdt,
          solAddress: trimmedSol,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setStatus({ type: 'error', message: data?.error || 'Failed to save wallet addresses.' })
        return
      }

      setStatus({ type: 'success', message: 'Wallet addresses updated successfully.' })
    } catch {
      setStatus({ type: 'error', message: 'Network error. Please try again.' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Bitcoin Wallet */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          Bitcoin (BTC) Address <span className="text-white/50 text-xs">(Optional)</span>
        </label>
        <input
          type="text"
          value={btcValue}
          onChange={event => setBtcValue(event.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none font-mono text-sm"
          placeholder="bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0emh"
        />
        <p className="text-xs text-white/50 mt-1">
          Only send Bitcoin to this address. Sending other coins may result in permanent loss.
        </p>
      </div>

      {/* Ethereum Wallet */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          Ethereum (ETH) Address <span className="text-white/50 text-xs">(Optional)</span>
        </label>
        <input
          type="text"
          value={ethValue}
          onChange={event => setEthValue(event.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none font-mono text-sm"
          placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
        />
        <p className="text-xs text-white/50 mt-1">ERC-20 compatible address for Ethereum payouts</p>
      </div>

      {/* USDT Wallet */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          USDT Address <span className="text-white/50 text-xs">(Optional)</span>
        </label>
        <input
          type="text"
          value={usdtValue}
          onChange={event => setUsdtValue(event.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none font-mono text-sm"
          placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb or TRC20 T..."
        />
        <p className="text-xs text-white/50 mt-1">Supports ERC-20 and TRC-20 destination formats</p>
      </div>

      {/* Litecoin Wallet */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          Litecoin (LTC) Address <span className="text-white/50 text-xs">(Optional)</span>
        </label>
        <input
          type="text"
          value={ltcValue}
          onChange={event => setLtcValue(event.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none font-mono text-sm"
          placeholder="LdP8Qox1VAhCzLJNqrr74YovaWYyNBUWvL"
        />
        <p className="text-xs text-white/50 mt-1">Only for Litecoin mining plan payouts</p>
      </div>

      {/* Solana Wallet */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          Solana (SOL) Address <span className="text-white/50 text-xs">(Optional)</span>
        </label>
        <input
          type="text"
          value={solValue}
          onChange={event => setSolValue(event.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none font-mono text-sm"
          placeholder="5hG9... (Base58 Solana address)"
        />
        <p className="text-xs text-white/50 mt-1">Used for SOL payout destinations</p>
      </div>

      {/* Warning Box */}
      <div
        className="p-4 rounded-lg"
        style={{
          background: 'rgba(234, 179, 8, 0.1)',
          border: '1px solid rgba(234, 179, 8, 0.3)',
        }}
      >
          <div className="flex gap-3">
            <span className="text-2xl">!</span>
          <div>
            <div className="font-semibold text-yellow-300 mb-1">Important</div>
            <div className="text-sm text-yellow-200/80">
              Double-check your wallet addresses before saving. Incorrect addresses may result in permanent loss of
              funds. We cannot recover funds sent to wrong addresses.
            </div>
          </div>
        </div>
      </div>

      {status && (
        <div
          className="px-4 py-3 rounded-lg text-sm"
          style={{
            background: status.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: status.type === 'success' ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(239,68,68,0.4)',
            color: status.type === 'success' ? '#6ee7b7' : '#fecaca',
          }}
        >
          {status.message}
        </div>
      )}

      {/* Save Button */}
      <div className="pt-4">
        <LoadingButton
          onClick={handleSubmit}
          isLoading={isSaving}
          loadingText="Saving..."
          className="px-6 py-3 rounded-full font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, #582dff, #3a137a)',
            color: '#ffffff',
          }}
        >
          Save Wallet Addresses
        </LoadingButton>
      </div>
    </div>
  )
}
