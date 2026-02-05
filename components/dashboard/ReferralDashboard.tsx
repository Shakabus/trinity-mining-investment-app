'use client'

import { useEffect, useMemo, useState } from 'react'
import LoadingButton from '@/components/ui/LoadingButton'
import { useCurrency } from '@/components/currency/CurrencyProvider'
import { useLanguage } from '@/components/i18n/LanguageProvider'

interface ReferralItem {
  id: number
  fullName: string | null
  email: string
  accountStatus: string
  createdAt: string
}

interface ReferralBonusEntry {
  id: number
  amountUsd: number
  createdAt: string
  status: string
  refereeName: string
}

interface ReferralWithdrawalEntry {
  id: number
  amountUsd: number
  status: string
  requestedAt: string
  coinType: string
}

interface ReferralDashboardProps {
  referralCode: string
  bonusPercent: number
  totalBonusUsd: number
  availableUsd: number
  pendingUsd: number
  minWithdrawalUsd: number
  referrals: ReferralItem[]
  bonuses: ReferralBonusEntry[]
  withdrawals: ReferralWithdrawalEntry[]
  walletAddresses: {
    BTC: string
    ETH: string
    LTC: string
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

export default function ReferralDashboard({
  referralCode,
  bonusPercent,
  totalBonusUsd,
  availableUsd,
  pendingUsd,
  minWithdrawalUsd,
  referrals,
  bonuses,
  withdrawals,
  walletAddresses,
}: ReferralDashboardProps) {
  const { currency, rates, format, convert } = useCurrency()
  const { t } = useLanguage()
  const rate = rates[currency] || 1
  const toUsd = (value: number) => (rate ? value / rate : value)
  const [origin, setOrigin] = useState('')
  const [withdrawCoin, setWithdrawCoin] = useState<'BTC' | 'ETH' | 'LTC'>('BTC')
  const [withdrawAmountUsd, setWithdrawAmountUsd] = useState(convert(minWithdrawalUsd).toFixed(2))
  const [withdrawStatus, setWithdrawStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isRequesting, setIsRequesting] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin)
    }
  }, [])

  useEffect(() => {
    if (Number(withdrawAmountUsd) < convert(minWithdrawalUsd)) {
      setWithdrawAmountUsd(convert(minWithdrawalUsd).toFixed(2))
    }
  }, [convert, minWithdrawalUsd, withdrawAmountUsd])

  const referralLink = useMemo(() => {
    if (!referralCode) return ''
    if (!origin) return ''
    return `${origin}/sign-up?ref=${referralCode}`
  }, [origin, referralCode])

  const handleWithdraw = async () => {
    const amountInput = Number(withdrawAmountUsd)
    const amountUsd = toUsd(amountInput)
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      setWithdrawStatus({ type: 'error', message: 'Enter a valid amount.' })
      return
    }
    if (amountUsd < minWithdrawalUsd) {
      setWithdrawStatus({
        type: 'error',
        message: `Minimum withdrawal is ${format(minWithdrawalUsd)}.`,
      })
      return
    }
    if (amountUsd > availableUsd) {
      setWithdrawStatus({ type: 'error', message: 'Amount exceeds available referral balance.' })
      return
    }
    if (!walletAddresses[withdrawCoin]) {
      setWithdrawStatus({ type: 'error', message: `Please add a ${withdrawCoin} wallet address.` })
      return
    }

    setIsRequesting(true)
    setWithdrawStatus(null)
    try {
      const response = await fetch('/api/user/referral-withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coinType: withdrawCoin, amountUsd }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Failed to submit referral withdrawal.')
      }
        setWithdrawStatus({ type: 'success', message: 'Referral withdrawal submitted.' })
        setWithdrawAmountUsd(convert(minWithdrawalUsd).toFixed(2))
      } catch (error: any) {
      setWithdrawStatus({
        type: 'error',
        message: error?.message || 'Failed to submit referral withdrawal.',
      })
    } finally {
      setIsRequesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{t('referralsTitle')}</h1>
        <p className="text-white/70">Share your link and earn {bonusPercent}% on first payments.</p>
      </div>

      <div
        className="p-6 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        <div className="text-sm text-white/60 mb-2">Your Referral Link</div>
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div
            className="flex-1 px-4 py-2 rounded-xl text-sm text-white/90 break-all font-mono tracking-wide"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {referralCode || 'Your referral code will appear once it is generated.'}
          </div>
          <button
            onClick={async () => {
              if (!referralCode) return
              const linkToCopy = referralLink || `${window.location.origin}/sign-up?ref=${referralCode}`
              await navigator.clipboard.writeText(linkToCopy)
              setIsCopied(true)
              setTimeout(() => setIsCopied(false), 2000)
            }}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: isCopied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.1)',
              color: '#fff',
              cursor: referralCode ? 'pointer' : 'not-allowed',
            }}
            disabled={!referralCode}
          >
            {isCopied ? 'Copied' : 'Copy Link'}
          </button>
        </div>
        {isCopied && (
          <div className="text-xs text-green-200 mt-2">Referral link copied to clipboard.</div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Referral Earnings', value: format(totalBonusUsd) },
          { label: 'Available for Withdrawal', value: format(availableUsd) },
          { label: 'Pending Requests', value: format(pendingUsd) },
        ].map(item => (
          <div
            key={item.label}
            className="p-5 rounded-3xl min-w-0"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
            }}
          >
            <div className="text-sm text-white/60 mb-1">{item.label}</div>
            <div className="text-2xl font-semibold text-white truncate" title={item.value}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div
        className="p-6 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h3 className="text-white font-semibold">Referral Withdrawal</h3>
          <div className="text-xs text-white/50">
            Minimum: {format(minWithdrawalUsd)} | Wallet: {walletAddresses[withdrawCoin] || 'Not set'}
          </div>
        </div>

        <div className="mb-4 flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs text-white/60 mb-1">Amount ({currency})</label>
            <input
              type="number"
              value={withdrawAmountUsd}
              min={convert(minWithdrawalUsd)}
              max={convert(availableUsd)}
              onChange={event => setWithdrawAmountUsd(event.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
              }}
            />
          </div>
          <div className="w-full md:w-40">
            <label className="block text-xs text-white/60 mb-1">Coin</label>
            <select
              value={withdrawCoin}
              onChange={event => setWithdrawCoin(event.target.value as 'BTC' | 'ETH' | 'LTC')}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
              }}
            >
              <option value="BTC" style={{ color: '#000000' }}>
                BTC
              </option>
              <option value="ETH" style={{ color: '#000000' }}>
                ETH
              </option>
              <option value="LTC" style={{ color: '#000000' }}>
                LTC
              </option>
            </select>
          </div>
        </div>

        {withdrawStatus && (
          <div
            className="px-3 py-2 rounded-lg text-xs mb-3"
            style={{
              background: withdrawStatus.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: withdrawStatus.type === 'success' ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(239,68,68,0.4)',
              color: withdrawStatus.type === 'success' ? '#6ee7b7' : '#fecaca',
            }}
          >
            {withdrawStatus.message}
          </div>
        )}

        <LoadingButton
          onClick={handleWithdraw}
          isLoading={isRequesting}
          loadingText="Submitting..."
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, #582dff, #3a137a)',
            color: '#ffffff',
          }}
        >
          Request Referral Withdrawal
        </LoadingButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="p-6 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <h3 className="text-white font-semibold mb-3">Referred Users</h3>
          {referrals.length === 0 ? (
            <div className="text-white/60 text-sm">No referred users yet.</div>
          ) : (
            <div className="space-y-3">
              {referrals.slice(0, 6).map(ref => (
                <div key={ref.id} className="flex items-center justify-between text-sm border-b border-white/10 pb-2">
                  <div>
                    <div className="text-white/90">{ref.fullName || ref.email}</div>
                    <div className="text-xs text-white/50">Joined: {formatDate(ref.createdAt)}</div>
                  </div>
                  <div className="text-xs text-white/60">{ref.accountStatus}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className="p-6 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <h3 className="text-white font-semibold mb-3">Referral Bonuses</h3>
          {bonuses.length === 0 ? (
            <div className="text-white/60 text-sm">No referral bonuses yet.</div>
          ) : (
            <div className="space-y-3">
              {bonuses.slice(0, 6).map(bonus => (
                <div key={bonus.id} className="flex items-center justify-between text-sm border-b border-white/10 pb-2">
                  <div>
                    <div className="text-white/90">{bonus.refereeName}</div>
                    <div className="text-xs text-white/50">Earned: {formatDate(bonus.createdAt)}</div>
                  </div>
                  <div className="text-white font-semibold">{format(bonus.amountUsd)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        className="p-6 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        <h3 className="text-white font-semibold mb-3">Referral Withdrawals</h3>
        {withdrawals.length === 0 ? (
          <div className="text-white/60 text-sm">No referral withdrawals yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/50 text-left">
                  <th className="py-2">Date</th>
                  <th className="py-2">Amount ({currency})</th>
                  <th className="py-2">Coin</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map(item => (
                  <tr key={item.id} className="border-t border-white/10">
                    <td className="py-2 text-white/80">{formatDate(item.requestedAt)}</td>
                    <td className="py-2 text-white/80">{format(item.amountUsd)}</td>
                    <td className="py-2 text-white/80">{item.coinType}</td>
                    <td className="py-2 text-white/80">{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
