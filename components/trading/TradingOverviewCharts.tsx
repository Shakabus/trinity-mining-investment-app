'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from 'react'
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
  const [equitySeries, setEquitySeries] = useState<{ time: number; value: number }[]>([])
  const [pnlSeries, setPnlSeries] = useState<{ time: number; value: number }[]>([])

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
      const filtered = schedulePoints.filter(point => point.time.getTime() <= now.getTime())
      const snapshot = simulateTradingProgress({
        investmentUsd,
        expectedReturnUsd,
        durationHours,
        startDate,
        now,
        seed,
      })
      const currentPoint = {
        time: now.getTime(),
        equity: Number(snapshot.equityUsd.toFixed(2)),
        pnl: Number(snapshot.pnlUsd.toFixed(2)),
      }
      const merged = [...filtered, { time: now, equity: currentPoint.equity, pnl: currentPoint.pnl }]

      const equity = merged.map(point => ({
        time: point.time.getTime(),
        value: point.equity,
      }))
      const pnl = merged.map(point => ({
        time: point.time.getTime(),
        value: point.pnl,
      }))

      setEquitySeries(equity.slice(-72))
      setPnlSeries(pnl.slice(-72))
    }

    updateSeries()
    const interval = setInterval(updateSeries, 15000)
    return () => clearInterval(interval)
  }, [schedulePoints, investmentUsd, expectedReturnUsd, durationHours, seed, startDate])

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
