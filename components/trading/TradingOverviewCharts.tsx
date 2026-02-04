'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'
import { TrendingUp, PieChart as PieIcon, Activity, BarChart3 } from 'lucide-react'
import { buildTradingJumpSeries, simulateTradingProgress } from '@/lib/trading'

interface TradingOverviewChartsProps {
  investmentUsd: number
  expectedReturnUsd: number
  durationHours: number
  startDateIso?: string | null
  seed: number
  allocationSeries: { name: string; value: number }[]
  performanceSeries: { label: string; value: number }[]
}

const COLORS = ['#60a5fa', '#34d399', '#f472b6', '#fbbf24']

export default function TradingOverviewCharts({
  investmentUsd,
  expectedReturnUsd,
  durationHours,
  startDateIso,
  seed,
  allocationSeries,
  performanceSeries,
}: TradingOverviewChartsProps) {
  const [equitySeries, setEquitySeries] = useState<{ time: string; value: number }[]>([])
  const [pnlSeries, setPnlSeries] = useState<{ time: string; value: number }[]>([])
  const lastEquityRef = useRef<number | null>(null)
  const lastPnlRef = useRef<number | null>(null)

  const startDate = useMemo(() => (startDateIso ? new Date(startDateIso) : new Date()), [startDateIso])

  useEffect(() => {
    const formatTime = (date: Date) =>
      date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

    const buildPoint = (at: Date) => {
      const snapshot = simulateTradingProgress({
        investmentUsd,
        expectedReturnUsd,
        durationHours,
        startDate,
        now: at,
        seed,
      })
      return {
        time: formatTime(at),
        equity: Number(snapshot.equityUsd.toFixed(2)),
        pnl: Number(snapshot.pnlUsd.toFixed(2)),
      }
    }

    const now = new Date()
    const endDate = now
    const initialPoints = buildTradingJumpSeries({
      startDate,
      endDate,
      expectedReturnUsd,
      investmentUsd,
      seed,
    }).map(point => ({
      time: formatTime(point.time),
      equity: point.equity,
      pnl: point.pnl,
    }))

    const seededEquity = initialPoints.map(point => ({ time: point.time, value: point.equity }))
    const seededPnl = initialPoints.map(point => ({ time: point.time, value: point.pnl }))
    const lastSeed = initialPoints[initialPoints.length - 1]
    setEquitySeries(seededEquity)
    setPnlSeries(seededPnl)
    lastEquityRef.current = lastSeed?.equity ?? null
    lastPnlRef.current = lastSeed?.pnl ?? null

    const interval = setInterval(() => {
      const point = buildPoint(new Date())
      const lastEquity = lastEquityRef.current
      const lastPnl = lastPnlRef.current
      const equityChanged = lastEquity === null || Math.abs(point.equity - lastEquity) >= 0.01
      const pnlChanged = lastPnl === null || Math.abs(point.pnl - lastPnl) >= 0.01

      if (equityChanged || pnlChanged) {
        setEquitySeries(prev => [...prev, { time: point.time, value: point.equity }].slice(-72))
        setPnlSeries(prev => [...prev, { time: point.time, value: point.pnl }].slice(-72))
        lastEquityRef.current = point.equity
        lastPnlRef.current = point.pnl
      }
    }, 15000)

    return () => clearInterval(interval)
  }, [investmentUsd, expectedReturnUsd, durationHours, seed, startDate])

  return (
    <div className="space-y-6">
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
            <TrendingUp size={16} />
            Portfolio value (USD)
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={equitySeries}>
              <XAxis dataKey="time" stroke="#ffffff40" style={{ fontSize: '11px' }} />
              <YAxis stroke="#ffffff40" style={{ fontSize: '11px' }} />
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

        <div
          className="p-6 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="flex items-center gap-2 text-white/70 text-sm mb-4">
            <Activity size={16} />
            Realized P/L trend
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={pnlSeries}>
              <XAxis dataKey="time" stroke="#ffffff40" style={{ fontSize: '11px' }} />
              <YAxis stroke="#ffffff40" style={{ fontSize: '11px' }} />
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
          <div className="flex items-center gap-2 text-white/70 text-sm mb-4">
            <PieIcon size={16} />
            Allocation mix
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={allocationSeries} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4}>
                {allocationSeries.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
            <BarChart3 size={16} />
            Strategy scorecards
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={performanceSeries}>
              <XAxis dataKey="label" stroke="#ffffff40" style={{ fontSize: '11px' }} />
              <YAxis stroke="#ffffff40" style={{ fontSize: '11px' }} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(0, 0, 0, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Bar dataKey="value" fill="#a78bfa" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
