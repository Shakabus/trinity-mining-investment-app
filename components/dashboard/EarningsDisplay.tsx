'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import LoadingButton from '@/components/ui/LoadingButton'
import EmptyState from '@/components/ui/EmptyState'
import { DollarSign } from 'lucide-react'

interface EarningsRecord {
  id: number
  coinType: string
  planName: string
  dailyEstimateUsd: number
  dailyEstimateCrypto: number
  totalEarnedUsd: number
  totalEarnedCrypto: number
  lastCalculatedAt: string | null
  isHistorical: boolean
  isWithdrawable: boolean
}

interface PayoutEntry {
  id: string
  date: string
  amountUsd: number
  status: string
  method: string
}

interface EarningsDisplayProps {
  records: EarningsRecord[]
  startDate: string | null
  lastUpdatedAt: string | null
  lastPayoutAt: string | null
  payouts: PayoutEntry[]
  withdrawableUsd: number
  pendingUsd: number
  minWithdrawalUsd: number
  walletAddresses: {
    BTC: string
    ETH: string
    LTC: string
  }
}

function formatDate(value: string | null) {
  if (!value) return 'Not available'
  return new Date(value).toLocaleString()
}

export default function EarningsDisplay({
  records,
  startDate,
  lastUpdatedAt,
  lastPayoutAt,
  payouts,
  withdrawableUsd,
  pendingUsd,
  minWithdrawalUsd,
  walletAddresses,
}: EarningsDisplayProps) {
  const [now, setNow] = useState(Date.now())
  const [withdrawCoin, setWithdrawCoin] = useState<'BTC' | 'ETH' | 'LTC'>('BTC')
  const [withdrawAmountUsd, setWithdrawAmountUsd] = useState(minWithdrawalUsd.toFixed(2))
  const [withdrawStatus, setWithdrawStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isRequesting, setIsRequesting] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000)
    return () => clearInterval(interval)
  }, [])

  const totals = useMemo(() => {
    return records.reduce(
      (acc, record) => {
        if (!record.isHistorical) {
          acc.dailyUsd += record.dailyEstimateUsd
        }
        acc.totalUsd += record.totalEarnedUsd
        if (!record.isHistorical) {
          acc.dailyCrypto += record.dailyEstimateCrypto
        }
        if (!record.isWithdrawable) {
          acc.lockedUsd += record.totalEarnedUsd
        } else {
          acc.withdrawableUsd += record.totalEarnedUsd
        }
        return acc
      },
      { dailyUsd: 0, totalUsd: 0, dailyCrypto: 0, lockedUsd: 0, withdrawableUsd: 0 }
    )
  }, [records])

  const liveTotals = useMemo(() => {
    const lastUpdateMs = lastUpdatedAt ? new Date(lastUpdatedAt).getTime() : now
    const elapsed = Math.max(0, (now - lastUpdateMs) / 1000)
    const rateUsd = totals.dailyUsd / 86400
    return {
      totalUsd: totals.totalUsd + rateUsd * elapsed,
      rateUsd,
    }
  }, [lastUpdatedAt, now, totals.dailyUsd, totals.totalUsd])

  useEffect(() => {
    if (Number(withdrawAmountUsd) < minWithdrawalUsd) {
      setWithdrawAmountUsd(minWithdrawalUsd.toFixed(2))
    }
  }, [minWithdrawalUsd, withdrawAmountUsd])

  const handleWithdraw = async () => {
    const amountUsd = Number(withdrawAmountUsd)
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      setWithdrawStatus({ type: 'error', message: 'Enter a valid amount.' })
      return
    }
    if (amountUsd < minWithdrawalUsd) {
      setWithdrawStatus({
        type: 'error',
        message: `Minimum withdrawal is $${minWithdrawalUsd.toFixed(2)}.`,
      })
      return
    }
    if (amountUsd > withdrawableUsd) {
      setWithdrawStatus({ type: 'error', message: 'Amount exceeds withdrawable balance.' })
      return
    }
    if (!walletAddresses[withdrawCoin]) {
      setWithdrawStatus({ type: 'error', message: `Please add a ${withdrawCoin} wallet address.` })
      return
    }

    setIsRequesting(true)
    setWithdrawStatus(null)
    try {
      const response = await fetch('/api/user/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coinType: withdrawCoin, amountUsd, amountCrypto: 0 }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Failed to submit withdrawal.')
      }
      setWithdrawStatus({ type: 'success', message: 'Withdrawal request submitted.' })
    } catch (error: any) {
      setWithdrawStatus({
        type: 'error',
        message: error?.message || 'Failed to submit withdrawal request.',
      })
    } finally {
      setIsRequesting(false)
    }
  }

  const liveRecords = useMemo(() => {
    return records.map(record => {
      const lastCalcMs = record.lastCalculatedAt ? new Date(record.lastCalculatedAt).getTime() : now
      const elapsed = Math.max(0, (now - lastCalcMs) / 1000)
      const rateCrypto = record.dailyEstimateCrypto / 86400
      const rateUsd = record.dailyEstimateUsd / 86400
      const canTick = !record.isHistorical && record.isWithdrawable
      return {
        ...record,
        liveTotalCrypto: canTick ? record.totalEarnedCrypto + rateCrypto * elapsed : record.totalEarnedCrypto,
        liveTotalUsd: canTick ? record.totalEarnedUsd + rateUsd * elapsed : record.totalEarnedUsd,
      }
    })
  }, [now, records])

  const hourlySeries = useMemo(() => {
    const points = []
    for (let i = 23; i >= 0; i -= 1) {
      const offsetSeconds = i * 3600
      const value = Math.max(0, liveTotals.totalUsd - liveTotals.rateUsd * offsetSeconds)
      const time = new Date(now - offsetSeconds * 1000).getHours()
      points.push({ time: `${time}:00`, value: Math.round(value * 100) / 100 })
    }
    return points
  }, [liveTotals.rateUsd, liveTotals.totalUsd, now])

  const weeklySeries = useMemo(() => {
    const points = []
    const startMs = startDate ? new Date(startDate).getTime() : now
    for (let i = 6; i >= 0; i -= 1) {
      const dayMs = now - i * 24 * 60 * 60 * 1000
      const label = new Date(dayMs).toLocaleDateString('en-US', { weekday: 'short' })
      if (dayMs < startMs) {
        points.push({ day: label, value: 0 })
        continue
      }
      points.push({ day: label, value: Math.round(liveTotals.rateUsd * 86400 * 100) / 100 })
    }
    return points
  }, [liveTotals.rateUsd, now, startDate])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className="p-6 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="text-sm text-white/60 mb-1">Estimated Daily Earnings</div>
          <div className="text-2xl font-semibold text-white">${totals.dailyUsd.toFixed(2)}</div>
          <div className="text-xs text-white/50 mt-2">Based on current hashrate and plan</div>
        </div>

        <div
          className="p-6 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="text-sm text-white/60 mb-1">Total Earned (USD)</div>
          <div className="text-2xl font-semibold text-white">${liveTotals.totalUsd.toFixed(2)}</div>
          <div className="text-xs text-white/50 mt-2">
            Withdrawable: ${totals.withdrawableUsd.toFixed(2)} | Pending release: ${totals.lockedUsd.toFixed(2)}
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
          <div className="text-sm text-white/60 mb-1">Last Payout</div>
          <div className="text-lg font-semibold text-white">{formatDate(lastPayoutAt)}</div>
          <div className="text-xs text-white/50 mt-2">Last update: {formatDate(lastUpdatedAt)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          className="lg:col-span-2 p-6 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <h3 className="text-white font-semibold mb-4">Last 24 Hours Earnings (USD)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={hourlySeries}>
              <XAxis dataKey="time" stroke="#ffffff40" style={{ fontSize: '12px' }} />
              <YAxis stroke="#ffffff40" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(0, 0, 0, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div
          className="p-6 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <h3 className="text-white font-semibold mb-4">Weekly Earnings (USD)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklySeries}>
              <XAxis dataKey="day" stroke="#ffffff40" style={{ fontSize: '12px' }} />
              <YAxis stroke="#ffffff40" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(0, 0, 0, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
        <h3 className="text-white font-semibold mb-4">Earnings by Asset</h3>
        {liveRecords.length === 0 ? (
          <EmptyState
            title="No earnings yet"
            description="Your earnings will appear here once mining is active and estimates are calculated."
            icon={<DollarSign className="text-white/70 mx-auto" size={36} />}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveRecords.map(record => (
              <div key={record.id} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-white font-semibold">{record.coinType}</div>
                <div className="text-xs text-white/50">{record.planName}</div>
                {record.isHistorical && !record.isWithdrawable && (
                  <div className="text-xs text-blue-300 mt-1">Pending system release</div>
                )}
                <div className="mt-2 text-sm text-white/80">
                  Daily estimate: {record.dailyEstimateCrypto.toFixed(8)} {record.coinType}
                </div>
                <div className="text-sm text-white/80">
                  Total earned: {record.liveTotalCrypto.toFixed(8)} {record.coinType}
                </div>
                <div className="text-xs text-white/40 mt-2">Last update: {formatDate(record.lastCalculatedAt)}</div>
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h3 className="text-white font-semibold">Withdrawals</h3>
          <div className="text-xs text-white/50">
            Withdrawable: ${withdrawableUsd.toFixed(2)} | Pending requests: ${pendingUsd.toFixed(2)}
          </div>
        </div>

        <div className="mb-5 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs text-white/60 mb-1">Amount (USD)</label>
              <input
                type="number"
                value={withdrawAmountUsd}
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
          <div className="text-xs text-white/50">
            Minimum withdrawal: ${minWithdrawalUsd.toFixed(2)}. Wallet: {walletAddresses[withdrawCoin] || 'Not set'}
          </div>
          {withdrawStatus && (
            <div
              className="px-3 py-2 rounded-lg text-xs"
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
            Request Withdrawal
          </LoadingButton>
        </div>

        {payouts.length === 0 ? (
          <div className="text-white/60 text-sm">No withdrawals yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/50 text-left">
                  <th className="py-2">Date</th>
                  <th className="py-2">Amount (USD)</th>
                  <th className="py-2">Coin</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map(row => (
                  <tr key={row.id} className="border-t border-white/10">
                    <td className="py-2 text-white/80">{formatDate(row.date)}</td>
                    <td className="py-2 text-white/80">${row.amountUsd.toFixed(2)}</td>
                    <td className="py-2 text-white/80">{row.method}</td>
                    <td className="py-2 text-white/80">{row.status}</td>
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
