'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ReferenceLine,
} from 'recharts'
import { Activity, TrendingUp, PieChart } from 'lucide-react'
import { simulateTradingProgress } from '@/lib/trading'

interface TradingBotChartsProps {
  seed: number
  investmentUsd: number
  expectedReturnUsd: number
  durationHours: number
  startDateIso?: string | null
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export default function TradingBotCharts({
  seed,
  investmentUsd,
  expectedReturnUsd,
  durationHours,
  startDateIso,
}: TradingBotChartsProps) {
  const [priceSeries, setPriceSeries] = useState<{ time: number; value: number }[]>([])
  const [pnlSeries, setPnlSeries] = useState<{ time: number; value: number }[]>([])
  const [volumeSeries, setVolumeSeries] = useState<{ time: number; value: number }[]>([])
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const startDate = useMemo(() => (startDateIso ? new Date(startDateIso) : new Date()), [startDateIso])

  useEffect(() => {
    const updateSeries = () => {
      const now = new Date()
      const snapshot = simulateTradingProgress({
        investmentUsd,
        expectedReturnUsd,
        durationHours,
        startDate,
        now,
        seed,
      })

      const momentumBase = snapshot.equityUsd
      const momentumNoise = Math.sin(seed + now.getTime() / 120000) * 120
      const momentumValue = Number((momentumBase + momentumNoise).toFixed(2))
      const pnlValue = Number(snapshot.pnlUsd.toFixed(2))
      const volumeValue = Math.round(clamp(55 + Math.abs(Math.sin(seed + now.getTime() / 180000) * 90), 20, 160))
      const time = now.getTime()

      setPriceSeries(prev => [...prev, { time, value: momentumValue }].slice(-24))
      setPnlSeries(prev => [...prev, { time, value: pnlValue }].slice(-24))
      setVolumeSeries(prev => [...prev, { time, value: volumeValue }].slice(-24))

      const nextDelay = 2 * 60 * 1000 + Math.floor(Math.random() * 3 * 60 * 1000)
      timeoutRef.current = setTimeout(updateSeries, nextDelay)
    }

    updateSeries()
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [investmentUsd, expectedReturnUsd, durationHours, seed, startDate])

  const lastPnl = pnlSeries.length > 0 ? pnlSeries[pnlSeries.length - 1].value : 0
  const pnlStroke = lastPnl >= 0 ? '#34d399' : '#f87171'
  const pnlFill = lastPnl >= 0 ? 'rgba(52, 211, 153, 0.25)' : 'rgba(248, 113, 113, 0.25)'

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
          <PieChart size={16} />
          Portfolio momentum (USD)
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={priceSeries}>
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
          Risk-adjusted performance
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={pnlSeries}>
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
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
            <Area type="monotone" dataKey="value" stroke={pnlStroke} fill={pnlFill} />
          </AreaChart>
        </ResponsiveContainer>
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
          Liquidity & turnover
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={volumeSeries}>
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
            <Bar dataKey="value" fill="#a78bfa" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
