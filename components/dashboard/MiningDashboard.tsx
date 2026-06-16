'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, Cpu, MapPin, Zap, TrendingUp } from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useCurrency } from '@/components/currency/CurrencyProvider'
import { getMiningDailyYieldPerTh } from '@/lib/mining-engine'
import {
  buildChartSampleOffsets,
  formatChartWindowLabel,
  formatCycleProgressLabel,
} from '@/lib/mining-chart'

interface MiningDashboardProps {
  mining: {
    id: number
    assignedHashrate: number
    hashrateUnit: string
    algorithm: string
    miningPool: string
    dataCenterLocation: string
    machineModel: string
    uptimePercentage: number
    planName: string
    coinType: string
    startDate: Date | null
    planDurationHours?: number
    elapsedPlanHours?: number
    chartWindowHours?: number
    currentHashrate: number
    validShares: number
    staleShares: number
    invalidShares: number
    lastHourShares: number
    lastHourStale: number
    lastHourInvalid: number
    lastDayShares: number
    lastDayStale: number
    lastDayInvalid: number
    latencyMs: number
    estimatedSecondsPerShare: number
    workerStatus: {
      total: number
      online: number
      offline: number
    }
    powerKw: number
    temperatureC: number
    difficultyChange: number
    totalEarnedCrypto: number
    estimatedDailyCrypto?: number
    hourlyHashrate: { time: string; hashrate: number }[]
    weeklyPerformance: { day: string; averageHashrate: number; validShares: number }[]
    isMiningActive: boolean
    historicalEarnings: {
      id: number
      planName: string
      coinType: string
      totalEarnedCrypto: number
      totalEarnedUsd: number
      isWithdrawable: boolean
    }[]
    assetStats?: {
      coinType: string
      assignedHashrate: number
      hashrateUnit: string
      currentHashrate: number
      totalEarnedCrypto: number
      estimatedDailyCrypto?: number
    }[]
  }
}

export default function MiningDashboard({ mining }: MiningDashboardProps) {
  const { format } = useCurrency()
  const [data, setData] = useState(mining)
  const [nowMs, setNowMs] = useState(0)

  useEffect(() => {
    setData(mining)
  }, [mining])

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/mining/stats', { cache: 'no-store' })
        if (!response.ok) {
          return
        }
        const updated = await response.json()
        setData(prev => ({
          ...prev,
          ...updated,
          historicalEarnings: prev.historicalEarnings,
        }))
      } catch {
        // Ignore polling errors to keep UI stable.
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setNowMs(Date.now())
    const interval = setInterval(() => setNowMs(Date.now()), 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const shareTotals = useMemo(() => {
    const total = data.validShares + data.staleShares + data.invalidShares
    return {
      total,
      valid: data.validShares,
      stale: data.staleShares,
      invalid: data.invalidShares,
    }
  }, [data.invalidShares, data.staleShares, data.validShares])

  const poolData = useMemo(
    () => [
      { name: 'Valid Shares', value: shareTotals.valid, color: '#10b981' },
      { name: 'Stale Shares', value: shareTotals.stale, color: '#f59e0b' },
      { name: 'Invalid Shares', value: shareTotals.invalid, color: '#ef4444' },
    ],
    [shareTotals]
  )

  const planDurationHours = Math.max(1, data.planDurationHours ?? 24)
  const elapsedPlanHours =
    typeof data.elapsedPlanHours === 'number' && Number.isFinite(data.elapsedPlanHours)
      ? Math.min(planDurationHours, Math.max(0, data.elapsedPlanHours))
      : data.startDate
        ? Math.min(
            planDurationHours,
            Math.max(0, (nowMs - new Date(data.startDate).getTime()) / (1000 * 60 * 60))
          )
        : 0
  const chartWindowHours = Math.max(
    1,
    Math.min(planDurationHours, (data.chartWindowHours ?? elapsedPlanHours) || 1)
  )
  const progressPercent = Math.min(100, Math.max(0, (elapsedPlanHours / planDurationHours) * 100))
  const recentShareWindowLabel = formatChartWindowLabel(Math.min(planDurationHours, 24))

  const hasMultiAssets = Boolean(data.assetStats && data.assetStats.length > 0)
  const earnedLabel = data.coinType === 'BTC' ? 'BITCOIN EARNED' : `${data.coinType} EARNED`
  const totalEarned = hasMultiAssets
    ? data.assetStats!.reduce((sum, asset) => sum + asset.totalEarnedCrypto, 0)
    : data.totalEarnedCrypto

  const fallbackEstimatedDailyCrypto = hasMultiAssets
    ? data.assetStats!.reduce((sum, asset) => {
        if (asset.estimatedDailyCrypto && asset.estimatedDailyCrypto > 0) {
          return sum + asset.estimatedDailyCrypto
        }
        const yieldPerTh = getMiningDailyYieldPerTh(asset.coinType)
        return sum + asset.assignedHashrate * yieldPerTh
      }, 0)
    : data.assignedHashrate * getMiningDailyYieldPerTh(data.coinType)

  const estimatedDailyCrypto =
    typeof data.estimatedDailyCrypto === 'number' && data.estimatedDailyCrypto > 0
      ? data.estimatedDailyCrypto
      : fallbackEstimatedDailyCrypto

  const actualDailyCrypto = elapsedPlanHours > 0 ? (totalEarned / elapsedPlanHours) * 24 : 0

  const earningsSeries = buildChartSampleOffsets(chartWindowHours, 24).map(offset => {
    const hoursAgo = chartWindowHours - offset
    const elapsedAtSample = Math.max(0, elapsedPlanHours - hoursAgo)
    const value = Math.max(0, totalEarned - (estimatedDailyCrypto / 24) * hoursAgo)
    return {
      time: formatCycleProgressLabel(elapsedAtSample, planDurationHours),
      value: Number(value.toFixed(8)),
    }
  })

  const estimatedVsActual = [
    {
      label: '24h Run Rate',
      estimated: Number(estimatedDailyCrypto.toFixed(8)),
      actual: Number(actualDailyCrypto.toFixed(8)),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Mining Dashboard</h1>
        <p className="text-white/70">
          Real-time monitoring - {data.planName} - {data.coinType}
          {!data.isMiningActive && <span className="ml-2 text-red-300">(Paused)</span>}
        </p>
      </div>

      {/* Live Mining Snapshot */}
      <div
        className="p-8 md:p-12 rounded-3xl text-center"
        style={{
          background: 'linear-gradient(135deg, rgba(88, 45, 255, 0.2), rgba(58, 19, 122, 0.1))',
          backdropFilter: 'blur(28px)',
          border: '2px solid rgba(88, 45, 255, 0.3)',
          boxShadow: '0 8px 32px rgba(88, 45, 255, 0.3)',
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <Activity size={24} className="text-green-400 animate-pulse" />
          <span className="text-white/70 text-sm font-medium">LIVE MINING STATUS</span>
        </div>
        <div className="max-w-2xl mx-auto space-y-4 text-left">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-xs uppercase tracking-wide text-white/60">HASHRATE (constant)</span>
            <span className="text-2xl md:text-3xl font-bold text-white font-mono">
              {data.assignedHashrate.toLocaleString(undefined, { maximumFractionDigits: 2 })} {data.hashrateUnit}
            </span>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-xs uppercase tracking-wide text-white/60">VALID SHARES</span>
            <span className="text-2xl md:text-3xl font-bold text-white font-mono">
              {data.validShares.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-xs uppercase tracking-wide text-white/60">
              {hasMultiAssets ? 'TOTAL EARNED (ALL ASSETS)' : earnedLabel}
            </span>
            <span className="text-2xl md:text-3xl font-bold text-white font-mono">
              {totalEarned.toFixed(8)} {hasMultiAssets ? '' : data.coinType}
              <span className="ml-2 text-xs text-white/50 font-sans">(increases slowly)</span>
            </span>
          </div>
        </div>
        <div className="mt-6 text-sm text-white/50">
          Current hashrate: {data.currentHashrate.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
          {data.hashrateUnit} - {Math.round(elapsedPlanHours)}h / {planDurationHours}h cycle (
          {progressPercent.toFixed(1)}%)
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="p-6 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
            <Zap size={16} />
            <span>Algorithm</span>
          </div>
          <div className="text-xl font-bold text-white">{data.algorithm}</div>
        </div>

        <div
          className="p-6 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
            <Activity size={16} />
            <span>Mining Pool</span>
          </div>
          <div className="text-xl font-bold text-white">{data.miningPool}</div>
        </div>

        <div
          className="p-6 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
            <MapPin size={16} />
            <span>Location</span>
          </div>
          <div className="text-lg font-bold text-white">{data.dataCenterLocation}</div>
        </div>

        <div
          className="p-6 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
            <TrendingUp size={16} />
            <span>Uptime</span>
          </div>
          <div className="text-xl font-bold text-green-400">{data.uptimePercentage}%</div>
        </div>
      </div>

      {/* Real-time Ops */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div
          className="p-5 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="text-xs uppercase tracking-wide text-white/60 mb-2">Share Quality (1h)</div>
          <div className="text-white text-sm">
            Valid: {data.lastHourShares.toLocaleString()} - Stale: {data.lastHourStale.toLocaleString()} - Invalid:{' '}
            {data.lastHourInvalid.toLocaleString()}
          </div>
          <div className="text-xs text-white/50 mt-2">Last {recentShareWindowLabel} valid: {data.lastDayShares.toLocaleString()}</div>
        </div>

        <div
          className="p-5 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="text-xs uppercase tracking-wide text-white/60 mb-2">Pool Latency</div>
          <div className="text-2xl font-semibold text-white">{data.latencyMs} ms</div>
          <div className="text-xs text-white/50 mt-2">Estimated time/share: {data.estimatedSecondsPerShare.toFixed(1)}s</div>
        </div>

        <div
          className="p-5 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="text-xs uppercase tracking-wide text-white/60 mb-2">Worker Status</div>
          <div className="text-white text-sm">
            Online: {data.workerStatus.online} - Offline: {data.workerStatus.offline} - Total:{' '}
            {data.workerStatus.total}
          </div>
          <div className="text-xs text-white/50 mt-2">Uptime tracked from pool</div>
        </div>

        <div
          className="p-5 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="text-xs uppercase tracking-wide text-white/60 mb-2">Power & Thermals</div>
          <div className="text-white text-sm">
            {data.powerKw.toFixed(1)} kW - {data.temperatureC} deg C
          </div>
          <div className="text-xs text-white/50 mt-2">
            Network difficulty: {data.difficultyChange >= 0 ? '+' : ''}
            {data.difficultyChange}%
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Share Distribution - Pie Chart */}
        <div
          className="p-6 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Cpu size={18} />
            Share Distribution
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={poolData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {poolData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'rgba(0, 0, 0, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {poolData.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: item.color }}></div>
                  <span className="text-white/70">{item.name}</span>
                </div>
                <span className="text-white font-semibold">
                  {item.value.toLocaleString()} (
                  {shareTotals.total > 0 ? Math.round((item.value / shareTotals.total) * 100) : 0}
                  %)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Hashrate Stability - Line Chart */}
        <div
          className="lg:col-span-2 p-6 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <h3 className="text-white font-semibold mb-4">Hashrate Stability (Cycle window: {formatChartWindowLabel(chartWindowHours)})</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.hourlyHashrate}>
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
              <Line type="monotone" dataKey="hashrate" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Shares Activity (Cycle window: {formatChartWindowLabel(chartWindowHours)}) */}
      <div
        className="p-6 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        <h3 className="text-white font-semibold mb-4">Shares Activity (Cycle window: {formatChartWindowLabel(chartWindowHours)})</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data.weeklyPerformance}>
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
            <Bar dataKey="validShares" fill="#10b981" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500"></div>
            <span className="text-white/70 text-sm">Valid Shares</span>
          </div>
        </div>
      </div>

      {/* Earnings Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="p-6 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <h3 className="text-white font-semibold mb-4">Earnings Over Time (Crypto)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={earningsSeries}>
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
              <Line type="monotone" dataKey="value" stroke="#60a5fa" strokeWidth={2} dot={false} />
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
          <h3 className="text-white font-semibold mb-4">Estimated vs Actual (24h run rate)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={estimatedVsActual}>
              <XAxis dataKey="label" stroke="#ffffff40" style={{ fontSize: '12px' }} />
              <YAxis stroke="#ffffff40" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(0, 0, 0, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Bar dataKey="estimated" fill="#a78bfa" radius={[8, 8, 0, 0]} />
              <Bar dataKey="actual" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-purple-400" />
              <span className="text-white/70 text-sm">Estimated</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500" />
              <span className="text-white/70 text-sm">Actual</span>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Asset Breakdown */}
      {hasMultiAssets && (
        <div
          className="p-6 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <h3 className="text-white font-semibold mb-4">Elite Plan Asset Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.assetStats!.map(asset => (
              <div key={asset.coinType} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-sm text-white/60 mb-1">{asset.coinType}</div>
                <div className="text-lg font-semibold text-white">
                  {asset.assignedHashrate.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
                  {asset.hashrateUnit}
                </div>
                <div className="text-xs text-white/50 mt-1">
                  Current: {asset.currentHashrate.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
                  {asset.hashrateUnit}
                </div>
                <div className="text-sm text-white/80 mt-2">
                  Earned: {asset.totalEarnedCrypto.toFixed(8)} {asset.coinType}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.historicalEarnings.length > 0 && (
        <div
          className="p-6 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <h3 className="text-white font-semibold mb-4">Previous Plan Earnings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.historicalEarnings.map((entry) => (
              <div key={entry.id} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-white font-semibold">{entry.planName}</div>
                <div className="text-xs text-white/50">{entry.coinType}</div>
                <div className="text-sm text-white/80 mt-2">
                  {entry.totalEarnedCrypto.toFixed(8)} {entry.coinType}
                </div>
                <div className="text-sm text-white/80">{format(entry.totalEarnedUsd)}</div>
                {!entry.isWithdrawable && (
                  <div className="text-xs text-blue-300 mt-2">Pending system release</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hardware Details */}
      <div
        className="p-6 md:p-8 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Cpu size={20} />
          Hardware Configuration
        </h3>
        <p className="text-white/80">{data.machineModel}</p>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-white/60 mb-1">Assigned Power</div>
            <div className="text-white font-semibold">
              {data.assignedHashrate} {data.hashrateUnit}
            </div>
          </div>
          <div>
            <div className="text-white/60 mb-1">Network Difficulty</div>
            <div className="text-white font-semibold">Auto-Adjusted</div>
          </div>
          <div>
            <div className="text-white/60 mb-1">Pool Fee</div>
            <div className="text-white font-semibold">2.5%</div>
          </div>
        </div>
      </div>
    </div>
  )
}
