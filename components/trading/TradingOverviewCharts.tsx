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
import { buildAllocationSeries, buildTradingJumpSeries, simulateTradingProgress } from '@/lib/trading'
import { useCurrency } from '@/components/currency/CurrencyProvider'

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
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export default function TradingOverviewCharts({
  investmentUsd,
  expectedReturnUsd,
  durationHours,
  startDateIso,
  seed,
  allocationSeries,
  performanceSeries,
}: TradingOverviewChartsProps) {
  const { currency, convert } = useCurrency()
  const [equitySeries, setEquitySeries] = useState<{ time: number; value: number }[]>([])
  const [pnlSeries, setPnlSeries] = useState<{ time: number; value: number }[]>([])
  const [allocationState, setAllocationState] = useState(allocationSeries)
  const [performanceState, setPerformanceState] = useState(performanceSeries)
  const lastIndexRef = useRef<number>(-1)
  const lastTickRef = useRef<number>(0)
  const allocationSeedRef = useRef<number>(seed * 1000)

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
    if (schedulePoints.length === 0) {
      setEquitySeries([])
      setPnlSeries([])
      lastIndexRef.current = -1
      return
    }

    const findLastIndex = (nowMs: number) => {
      let idx = -1
      for (let i = 0; i < schedulePoints.length; i += 1) {
        if (schedulePoints[i].time.getTime() <= nowMs) {
          idx = i
        } else {
          break
        }
      }
      return idx
    }

    const windowMs = 3 * 60 * 60 * 1000
    const trimWindow = (points: { time: number; value: number }[], nowMs: number) =>
      points.filter(point => point.time >= nowMs - windowMs)
    const currentPoint = (nowMs: number) => {
      const snapshot = simulateTradingProgress({
        investmentUsd,
        expectedReturnUsd,
        durationHours,
        startDate,
        now: new Date(nowMs),
        seed,
      })
      return {
        equity: { time: nowMs, value: Number(convert(snapshot.equityUsd).toFixed(2)) },
        pnl: { time: nowMs, value: Number(convert(snapshot.pnlUsd).toFixed(2)) },
        snapshot,
      }
    }

    const seedSeries = () => {
      const nowMs = Date.now()
      const lastIndex = findLastIndex(nowMs)
      const point = currentPoint(nowMs)
      const windowStart = nowMs - windowMs
      const seedPoints =
        lastIndex < 0
          ? []
          : schedulePoints.filter(point => point.time.getTime() >= windowStart && point.time.getTime() <= nowMs)
      setEquitySeries(
        trimWindow(
          [...seedPoints.map(point => ({ time: point.time.getTime(), value: convert(point.equity) })), point.equity],
          nowMs
        )
      )
      setPnlSeries(
        trimWindow(
          [...seedPoints.map(point => ({ time: point.time.getTime(), value: convert(point.pnl) })), point.pnl],
          nowMs
        )
      )
      lastIndexRef.current = lastIndex
      lastTickRef.current = nowMs
    }

    seedSeries()

    const interval = setInterval(() => {
      const nowMs = Date.now()
      const lastIndex = findLastIndex(nowMs)
      if (lastIndex > lastIndexRef.current && lastIndex >= 0) {
        const newPoints = schedulePoints.slice(lastIndexRef.current + 1, lastIndex + 1)
        const nowMsWindow = Date.now()
        setEquitySeries(prev =>
          trimWindow([...prev, ...newPoints.map(point => ({ time: point.time.getTime(), value: convert(point.equity) }))], nowMsWindow)
        )
        setPnlSeries(prev =>
          trimWindow([...prev, ...newPoints.map(point => ({ time: point.time.getTime(), value: convert(point.pnl) }))], nowMsWindow)
        )
        lastIndexRef.current = lastIndex
      }

      // Always push a live point so charts keep moving even between jump checkpoints.
      if (nowMs - lastTickRef.current < 15000) {
        return
      }
      const point = currentPoint(nowMs)
      setEquitySeries(prev => trimWindow([...prev, point.equity], nowMs))
      setPnlSeries(prev => trimWindow([...prev, point.pnl], nowMs))
      lastTickRef.current = nowMs

      allocationSeedRef.current += 1 + Math.round(Math.sin(nowMs / 60000) * 2)
      const nextAllocation = buildAllocationSeries(allocationSeedRef.current)
      const pnlRatio = expectedReturnUsd > 0 ? point.snapshot.pnlUsd / expectedReturnUsd : 0
      const bias = pnlRatio >= 0 ? Math.min(0.25, pnlRatio * 0.5) : -Math.min(0.25, Math.abs(pnlRatio) * 0.5)
      const maxValue = Math.max(...nextAllocation.map(x => x.value))
      const nextPerformance = nextAllocation.map(item => {
        const base = item.value * (0.8 + Math.abs(bias))
        const direction = item.value === maxValue ? bias : bias * 0.35
        const value = Math.round(clamp(base + base * direction, 12, 100))
        return { label: item.name, value }
      })
      setAllocationState(nextAllocation)
      setPerformanceState(nextPerformance)
    }, 15000)

    return () => {
      clearInterval(interval)
    }
  }, [schedulePoints, investmentUsd, expectedReturnUsd, durationHours, seed, startDate, convert])

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
            Portfolio value ({currency})
          </div>
          <div className="px-[5px]">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={equitySeries} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
              <XAxis
                dataKey="time"
                type="number"
                domain={['dataMin', 'dataMax']}
                interval="preserveStartEnd"
                minTickGap={22}
                tickCount={5}
                tickFormatter={value =>
                  new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                }
                stroke="#ffffff40"
                style={{ fontSize: '11px' }}
              />
              <YAxis width={44} tickMargin={8} stroke="#ffffff40" style={{ fontSize: '11px' }} />
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
            <Activity size={16} />
            Realized P/L trend ({currency})
          </div>
          <div className="px-[5px]">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={pnlSeries} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
              <XAxis
                dataKey="time"
                type="number"
                domain={['dataMin', 'dataMax']}
                interval="preserveStartEnd"
                minTickGap={22}
                tickCount={5}
                tickFormatter={value =>
                  new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                }
                stroke="#ffffff40"
                style={{ fontSize: '11px' }}
              />
              <YAxis width={44} tickMargin={8} stroke="#ffffff40" style={{ fontSize: '11px' }} />
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
          <div className="px-[5px]">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
              <Pie data={allocationState} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4}>
                {allocationState.map((_, index) => (
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
                itemStyle={{ color: '#ffffff' }}
              />
              </PieChart>
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
            <BarChart3 size={16} />
            Strategy scorecards
          </div>
          <div className="px-[5px]">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={performanceState} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
              <XAxis dataKey="label" stroke="#ffffff40" style={{ fontSize: '11px' }} />
              <YAxis width={44} tickMargin={8} stroke="#ffffff40" style={{ fontSize: '11px' }} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(0, 0, 0, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#fff',
                }}
                itemStyle={{ color: '#ffffff' }}
              />
              <Bar dataKey="value" fill="#a78bfa" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
