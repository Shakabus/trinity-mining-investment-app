'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import LoadingButton from '@/components/ui/LoadingButton'
import EmptyState from '@/components/ui/EmptyState'
import { DollarSign } from 'lucide-react'
import { useCurrency } from '@/components/currency/CurrencyProvider'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import {
  buildChartSampleOffsets,
  buildCycleSegments,
  formatChartWindowLabel,
  formatCycleProgressLabel,
  resolveChartWindowHours,
  resolveElapsedPlanHours,
  resolvePlanDurationHours,
} from '@/lib/mining-chart'

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
  planDurationDays?: number | null
  lastUpdatedAt: string | null
  lastPayoutAt: string | null
  payouts: PayoutEntry[]
  withdrawableUsd: number
  pendingUsd: number
  minWithdrawalUsd: number
}

export default function EarningsDisplay({
  records,
  startDate,
  planDurationDays,
  lastUpdatedAt,
  lastPayoutAt,
  payouts,
  withdrawableUsd,
  pendingUsd,
  minWithdrawalUsd,
}: EarningsDisplayProps) {
  const { currency, rates, format, convert } = useCurrency()
  const { t } = useLanguage()
  const rate = rates[currency] || 1
  const toUsd = (value: number) => (rate ? value / rate : value)
  const [now, setNow] = useState(Date.now())
  const [withdrawCoin, setWithdrawCoin] = useState<'BTC' | 'ETH' | 'USDT' | 'SOL'>('BTC')
  const [withdrawAmountUsd, setWithdrawAmountUsd] = useState(convert(minWithdrawalUsd).toFixed(2))
  const [withdrawStatus, setWithdrawStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isRequesting, setIsRequesting] = useState(false)

  const formatDate = (value: string | null) => {
    if (!value) return t('notAvailable')
    return new Date(value).toLocaleString()
  }

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

  const planDurationHours = useMemo(
    () => resolvePlanDurationHours(planDurationDays),
    [planDurationDays]
  )
  const elapsedPlanHours = useMemo(
    () => resolveElapsedPlanHours(startDate ? new Date(startDate) : null, new Date(now)),
    [now, startDate]
  )
  const chartWindowHours = useMemo(
    () => resolveChartWindowHours(planDurationHours, elapsedPlanHours),
    [elapsedPlanHours, planDurationHours]
  )
  const cycleWindowLabel = useMemo(
    () => formatChartWindowLabel(chartWindowHours),
    [chartWindowHours]
  )

  useEffect(() => {
    if (Number(withdrawAmountUsd) < convert(minWithdrawalUsd)) {
      setWithdrawAmountUsd(convert(minWithdrawalUsd).toFixed(2))
    }
  }, [convert, minWithdrawalUsd, withdrawAmountUsd])

  const handleWithdraw = async () => {
    const amountInput = Number(withdrawAmountUsd)
    const amountUsd = toUsd(amountInput)
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      setWithdrawStatus({ type: 'error', message: t('withdrawValidAmount') })
      return
    }
    if (amountUsd < minWithdrawalUsd) {
      setWithdrawStatus({
        type: 'error',
        message: t('withdrawMin').replace('{amount}', format(minWithdrawalUsd)),
      })
      return
    }
    if (amountUsd > withdrawableUsd) {
      setWithdrawStatus({ type: 'error', message: t('withdrawExceeds') })
      return
    }

    setIsRequesting(true)
    setWithdrawStatus(null)
    try {
      const response = await fetch('/api/user/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coinType: withdrawCoin, amountUsd }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || t('withdrawFailed'))
      }
      setWithdrawStatus({
        type: 'success',
        message: 'Withdrawal to account balance submitted for review.',
      })
      setWithdrawAmountUsd(convert(minWithdrawalUsd).toFixed(2))
    } catch (error: any) {
      setWithdrawStatus({
        type: 'error',
        message: error?.message || t('withdrawFailed'),
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
      const canTick = !record.isHistorical
      return {
        ...record,
        liveTotalCrypto: canTick ? record.totalEarnedCrypto + rateCrypto * elapsed : record.totalEarnedCrypto,
        liveTotalUsd: canTick ? record.totalEarnedUsd + rateUsd * elapsed : record.totalEarnedUsd,
      }
    })
  }, [now, records])

  const hourlySeries = useMemo(() => {
    return buildChartSampleOffsets(chartWindowHours, 24).map(offset => {
      const hoursAgo = chartWindowHours - offset
      const value = Math.max(0, liveTotals.totalUsd - liveTotals.rateUsd * hoursAgo * 3600)
      const elapsedAtSample = Math.max(0, elapsedPlanHours - hoursAgo)
      const converted = convert(value)
      return {
        time: formatCycleProgressLabel(elapsedAtSample, planDurationHours),
        value: Math.round(converted * 100) / 100,
      }
    })
  }, [chartWindowHours, convert, elapsedPlanHours, liveTotals.rateUsd, liveTotals.totalUsd, planDurationHours])

  const weeklySeries = useMemo(() => {
    return buildCycleSegments(chartWindowHours, 8).map(segment => {
      const segmentHours = Math.max(1 / 6, segment.endHour - segment.startHour)
      const segmentRateUsd = liveTotals.rateUsd * segmentHours * 3600
      const converted = convert(segmentRateUsd)
      const elapsedAtSegmentEnd = Math.min(
        planDurationHours,
        Math.max(0, elapsedPlanHours - (chartWindowHours - segment.endHour))
      )
      return {
        day: formatCycleProgressLabel(elapsedAtSegmentEnd, planDurationHours),
        value: Math.round(converted * 100) / 100,
      }
    })
  }, [chartWindowHours, convert, elapsedPlanHours, liveTotals.rateUsd, planDurationHours])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className="p-6 rounded-3xl min-w-0"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="text-sm text-white/60 mb-1">{t('estimatedDailyEarnings')}</div>
          <div className="text-2xl font-semibold text-white truncate" title={format(totals.dailyUsd)}>
            {format(totals.dailyUsd)}
          </div>
          <div className="text-xs text-white/50 mt-2">{t('basedOnHashrate')}</div>
        </div>

        <div
          className="p-6 rounded-3xl min-w-0"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="text-sm text-white/60 mb-1">{t('totalEarnedLabel')} ({currency})</div>
          <div className="text-2xl font-semibold text-white truncate" title={format(liveTotals.totalUsd)}>
            {format(liveTotals.totalUsd)}
          </div>
          <div
            className="text-xs text-white/50 mt-2 truncate"
            title={`${t('withdrawableLabel')}: ${format(totals.withdrawableUsd)} | ${t('pendingReleaseLabel')}: ${format(totals.lockedUsd)}`}
          >
            {t('withdrawableLabel')}: {format(totals.withdrawableUsd)} | {t('pendingReleaseLabel')}: {format(totals.lockedUsd)}
          </div>
        </div>

        <div
          className="p-6 rounded-3xl min-w-0"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="text-sm text-white/60 mb-1">{t('lastPayoutLabel')}</div>
          <div className="text-lg font-semibold text-white">{formatDate(lastPayoutAt)}</div>
          <div className="text-xs text-white/50 mt-2">
            {t('lastUpdateLabel')}: {formatDate(lastUpdatedAt)}
          </div>
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
          <h3 className="text-white font-semibold mb-4">
            {t('earnings24h')} ({currency}) • {cycleWindowLabel}
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={hourlySeries} margin={{ left: 5, right: 5, top: 5, bottom: 0 }}>
              <XAxis dataKey="time" stroke="#ffffff40" style={{ fontSize: '12px' }} tickMargin={6} />
              <YAxis stroke="#ffffff40" style={{ fontSize: '12px' }} width={36} tickMargin={6} />
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
          <h3 className="text-white font-semibold mb-4">
            Cycle Segments ({currency}) • {cycleWindowLabel}
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklySeries} margin={{ left: 5, right: 5, top: 5, bottom: 0 }}>
              <XAxis dataKey="day" stroke="#ffffff40" style={{ fontSize: '12px' }} tickMargin={6} />
              <YAxis stroke="#ffffff40" style={{ fontSize: '12px' }} width={36} tickMargin={6} />
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
        <h3 className="text-white font-semibold mb-4">{t('earningsByAsset')}</h3>
        {liveRecords.length === 0 ? (
          <EmptyState
            title={t('noEarningsTitle')}
            description={t('noEarningsDescription')}
            icon={<DollarSign className="text-white/70 mx-auto" size={36} />}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveRecords.map(record => (
              <div key={record.id} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-white font-semibold">{record.coinType}</div>
                <div className="text-xs text-white/50">{record.planName}</div>
                {record.isHistorical && !record.isWithdrawable && (
                  <div className="text-xs text-blue-300 mt-1">{t('pendingSystemRelease')}</div>
                )}
                <div className="mt-2 text-sm text-white/80">
                  {t('dailyEstimateLabel')}: {record.dailyEstimateCrypto.toFixed(8)} {record.coinType}
                </div>
                <div className="text-sm text-white/80">
                  {t('totalEarnedLabel')}: {record.liveTotalCrypto.toFixed(8)} {record.coinType}
                </div>
                <div className="text-xs text-white/40 mt-2">
                  {t('lastUpdateLabel')}: {formatDate(record.lastCalculatedAt)}
                </div>
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
          <h3 className="text-white font-semibold">{t('withdrawals')}</h3>
          <div className="text-xs text-white/50">
            {t('withdrawableLabel')}: {format(withdrawableUsd)} | {t('pendingRequests')}: {format(pendingUsd)}
          </div>
        </div>

        <div className="mb-5 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs text-white/60 mb-1">{t('withdrawalAmountLabel')} ({currency})</label>
              <input
                type="number"
                value={withdrawAmountUsd}
                min={convert(minWithdrawalUsd)}
                max={convert(withdrawableUsd)}
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
              <label className="block text-xs text-white/60 mb-1">{t('withdrawalCoinLabel')}</label>
              <select
                value={withdrawCoin}
                onChange={event => setWithdrawCoin(event.target.value as 'BTC' | 'ETH' | 'USDT' | 'SOL')}
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
                <option value="USDT" style={{ color: '#000000' }}>
                  USDT
                </option>
                <option value="SOL" style={{ color: '#000000' }}>
                  SOL
                </option>
              </select>
            </div>
          </div>
          <div className="text-xs text-white/50">
            {t('minWithdrawalLabel')}: {format(minWithdrawalUsd)}. Destination: Account Balance (review required)
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
            loadingText={t('submitting')}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #582dff, #3a137a)',
              color: '#ffffff',
            }}
          >
            Withdraw to Account Balance
          </LoadingButton>
        </div>

        {payouts.length === 0 ? (
          <div className="text-white/60 text-sm">{t('noWithdrawalsYet')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/50 text-left">
                  <th className="py-2">{t('activityTableDate')}</th>
                  <th className="py-2">{t('withdrawalAmountLabel')} ({currency})</th>
                  <th className="py-2">{t('withdrawalCoinLabel')}</th>
                  <th className="py-2">{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map(row => (
                  <tr key={row.id} className="border-t border-white/10">
                    <td className="py-2 text-white/80">{formatDate(row.date)}</td>
                    <td className="py-2 text-white/80">{format(row.amountUsd)}</td>
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
