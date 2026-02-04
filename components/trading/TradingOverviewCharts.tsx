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
  const [equitySeries, setEquitySeries] = useState<{ time: number; value: number }[]>([])
  const [pnlSeries, setPnlSeries] = useState<{ time: number; value: number }[]>([])
  const [allocationState, setAllocationState] = useState(allocationSeries)
  const [performanceState, setPerformanceState] = useState(performanceSeries)
  const lastIndexRef = useRef<number>(-1)
  const lastTickRef = useRef<number | null>(null)
  const allocationSeedRef = useRef<number>(seed * 1000)
  const allocationTickRef = useRef<number>(0)

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

    const seedSeries = () => {
      const nowMs = Date.now()
      const lastIndex = findLastIndex(nowMs)
      if (lastIndex < 0) {
        setEquitySeries([])
        setPnlSeries([])
        lastIndexRef.current = -1
        lastTickRef.current = null
        return
      }
      const windowStart = nowMs - windowMs
      const seedPoints = schedulePoints.filter(point => point.time.getTime() >= windowStart && point.time.getTime() <= nowMs)
      setEquitySeries(seedPoints.map(point => ({ time: point.time.getTime(), value: point.equity })))
      setPnlSeries(seedPoints.map(point => ({ time: point.time.getTime(), value: point.pnl })))
      lastIndexRef.current = lastIndex
      const lastSeed = seedPoints[seedPoints.length - 1]
      lastTickRef.current = lastSeed ? lastSeed.time.getTime() : null
    }

    seedSeries()

    const interval = setInterval(() => {
      const nowMs = Date.now()
      const lastIndex = findLastIndex(nowMs)
      if (lastIndex <= lastIndexRef.current || lastIndex < 0) {
        return
      }
      const newPoints = schedulePoints.slice(lastIndexRef.current + 1, lastIndex + 1)
      lastIndexRef.current = lastIndex
      const lastPoint = newPoints[newPoints.length - 1]
      if (lastPoint) {
        lastTickRef.current = lastPoint.time.getTime()
      }
      const nowMsWindow = Date.now()
      setEquitySeries(prev =>
        trimWindow([...prev, ...newPoints.map(point => ({ time: point.time.getTime(), value: point.equity }))], nowMsWindow)
      )
      setPnlSeries(prev =>
        trimWindow([...prev, ...newPoints.map(point => ({ time: point.time.getTime(), value: point.pnl }))], nowMsWindow)
      )

      const focusSeed = seed + lastIndex * 17
      const nextAllocation = buildAllocationSeries(focusSeed)
      const pnlSignal = lastPoint ? lastPoint.pnl : 0
      const pnlRatio = expectedReturnUsd > 0 ? pnlSignal / expectedReturnUsd : 0
      const bias = pnlRatio >= 0 ? Math.min(0.35, pnlRatio * 0.6) : -Math.min(0.35, Math.abs(pnlRatio) * 0.6)
      const nextPerformance = nextAllocation.map(item => {
        const base = item.value * (0.85 + Math.abs(bias))
        const direction = item.value === Math.max(...nextAllocation.map(x => x.value)) ? bias : bias * 0.4
        const value = Math.round(clamp(base + base * direction, 12, 100))
        return { label: item.name, value }
      })
      setAllocationState(nextAllocation)
      setPerformanceState(nextPerformance)
    }, 15000)

    const microInterval = setInterval(() => {
      const now = new Date()
      const nowMs = now.getTime()
      const lastTickMs = lastTickRef.current ?? startDate.getTime()
      const minGapMs = 60 * 1000
      if (nowMs - lastTickMs < minGapMs) {
        return
      }
      const snapshot = simulateTradingProgress({
        investmentUsd,
        expectedReturnUsd,
        durationHours,
        startDate,
        now,
        seed,
      })
      const equityValue = Number(snapshot.equityUsd.toFixed(2))
      const pnlValue = Number(snapshot.pnlUsd.toFixed(2))
      const tickTime = nowMs
      lastTickRef.current = tickTime
      setEquitySeries(prev => trimWindow([...prev, { time: tickTime, value: equityValue }], nowMs))
      setPnlSeries(prev => trimWindow([...prev, { time: tickTime, value: pnlValue }], nowMs))
    }, 60000)

    const allocationInterval = setInterval(() => {
      const nowMs = Date.now()
      const minGapMs = 2 * 60 * 1000
      if (nowMs - allocationTickRef.current < minGapMs) {
        return
      }
      allocationTickRef.current = nowMs
      allocationSeedRef.current += 1 + Math.round(Math.sin(nowMs / 60000) * 2)
      const nextAllocation = buildAllocationSeries(allocationSeedRef.current)
      const snapshot = simulateTradingProgress({
        investmentUsd,
        expectedReturnUsd,
        durationHours,
        startDate,
        now: new Date(nowMs),
        seed,
      })
      const pnlRatio = expectedReturnUsd > 0 ? snapshot.pnlUsd / expectedReturnUsd : 0
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
    }, 60000)

    return () => {
      clearInterval(interval)
      clearInterval(microInterval)
      clearInterval(allocationInterval)
    }
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
            <Activity size={16} />
            Realized P/L trend
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
              <YAxis width={34} tickMargin={6} stroke="#ffffff40" style={{ fontSize: '11px' }} />
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
              <YAxis width={34} tickMargin={6} stroke="#ffffff40" style={{ fontSize: '11px' }} />
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
