'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import { DollarSign, TrendingUp, Scale } from 'lucide-react'
import { buildTradingJumpSeries, simulateTradingProgress } from '@/lib/trading'

interface TradingEarningsChartsProps {
  investmentUsd: number
  expectedReturnUsd: number
  durationHours: number
  startDateIso?: string | null
  seed: number
}

export default function TradingEarningsCharts({
  investmentUsd,
  expectedReturnUsd,
  durationHours,
  startDateIso,
  seed,
}: TradingEarningsChartsProps) {
  const [earningsSeries, setEarningsSeries] = useState<{ time: number; value: number }[]>([])
  const [drawdownSeries, setDrawdownSeries] = useState<{ time: number; value: number }[]>([])
  const [estimateSeries, setEstimateSeries] = useState<{ label: string; estimated: number; actual: number }[]>([])

  const startDate = useMemo(() => (startDateIso ? new Date(startDateIso) : new Date()), [startDateIso])

  const schedulePoints = useMemo(() => {
    return buildTradingJumpSeries({
      startDate,
      endDate: new Date(startDate.getTime() + durationHours * 60 * 60 * 1000),
      expectedReturnUsd,
      investmentUsd,
      seed,
    })
  }, [startDate, durationHours, expectedReturnUsd, investmentUsd, seed])

  useEffect(() => {
    const updateSeries = () => {
      const now = new Date()
      const nowMs = now.getTime()
      const filtered = schedulePoints.filter(point => point.time.getTime() <= nowMs)
      const snapshot = simulateTradingProgress({
        investmentUsd,
        expectedReturnUsd,
        durationHours,
        startDate,
        now,
        seed,
      })
      const merged = [
        ...filtered,
        {
          time: now,
          earnedUsd: snapshot.earnedUsd,
          pnl: snapshot.pnlUsd,
          equity: snapshot.equityUsd,
        },
      ]

      let peakEquity = -Infinity
      const earnings = merged.map(point => {
        peakEquity = Math.max(peakEquity, point.equity)
        return {
          time: point.time.getTime(),
          value: Number(point.earnedUsd.toFixed(2)),
        }
      })
      peakEquity = -Infinity
      const drawdowns = merged.map(point => {
        peakEquity = Math.max(peakEquity, point.equity)
        const drawdown = Math.max(0, peakEquity - point.equity)
        return {
          time: point.time.getTime(),
          value: Number(drawdown.toFixed(2)),
        }
      })

      const elapsedDays = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / 86400000))
      const estimatedDaily = durationHours > 0 ? expectedReturnUsd / (durationHours / 24) : 0
      const actualDaily = snapshot.earnedUsd / elapsedDays

      setEarningsSeries(earnings.slice(-72))
      setDrawdownSeries(drawdowns.slice(-72))
      setEstimateSeries([
        {
          label: 'Daily',
          estimated: Number(estimatedDaily.toFixed(2)),
          actual: Number(actualDaily.toFixed(2)),
        },
      ])
    }

    updateSeries()
    const interval = setInterval(updateSeries, 60000)
    return () => clearInterval(interval)
  }, [schedulePoints, investmentUsd, expectedReturnUsd, durationHours, seed, startDate])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div
        className="p-6 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        <div className="flex items-center gap-2 text-white/70 text-sm mb-4">
          <DollarSign size={16} />
          Earnings over time
        </div>
        <div className="px-[5px]">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={earningsSeries} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
            <XAxis
              dataKey="time"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={value =>
                new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
              }
              stroke="#ffffff40"
              style={{ fontSize: '11px' }}
            />
            <YAxis width={34} tickMargin={6} stroke="#ffffff40" style={{ fontSize: '11px' }} />
            <Tooltip
              contentStyle={{
                background: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Line type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2} dot={false} />
            </LineChart>
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
        <div className="flex items-center gap-2 text-white/70 text-sm mb-4">
          <Scale size={16} />
          Estimated vs actual
        </div>
        <div className="px-[5px]">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={estimateSeries} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
            <XAxis dataKey="label" stroke="#ffffff40" style={{ fontSize: '11px' }} />
            <YAxis width={34} tickMargin={6} stroke="#ffffff40" style={{ fontSize: '11px' }} />
            <Tooltip
              contentStyle={{
                background: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Bar dataKey="estimated" fill="#60a5fa" radius={[6, 6, 0, 0]} />
            <Bar dataKey="actual" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div
        className="lg:col-span-2 p-6 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        <div className="flex items-center gap-2 text-white/70 text-sm mb-4">
          <TrendingUp size={16} />
          Drawdown & recovery
        </div>
        <div className="px-[5px]">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={drawdownSeries} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
            <XAxis
              dataKey="time"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={value =>
                new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
              }
              stroke="#ffffff40"
              style={{ fontSize: '11px' }}
            />
            <YAxis width={34} tickMargin={6} stroke="#ffffff40" style={{ fontSize: '11px' }} />
            <Tooltip
              contentStyle={{
                background: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Line type="monotone" dataKey="value" stroke="#fbbf24" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
