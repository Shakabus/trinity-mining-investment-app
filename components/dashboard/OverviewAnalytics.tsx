'use client'

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
import { Activity, TrendingUp, BarChart3, Scale } from 'lucide-react'
import { useCurrency } from '@/components/currency/CurrencyProvider'

interface OverviewAnalyticsProps {
  earningsSeries: { time: string; value: number }[]
  hashrateSeries: { time: string; value: number }[]
  sharesSeries: { day: string; value: number }[]
  estimatedVsActual: { label: string; estimated: number; actual: number }[]
}

export default function OverviewAnalytics({
  earningsSeries,
  hashrateSeries,
  sharesSeries,
  estimatedVsActual,
}: OverviewAnalyticsProps) {
  const { currency } = useCurrency()
  return (
    <div className="space-y-6">
      <h2 className="text-2xl md:text-3xl font-bold text-white">Performance Analytics</h2>

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
            Earnings over time ({currency})
          </div>
          <div className="px-[5px]">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={earningsSeries} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                <XAxis dataKey="time" stroke="#ffffff40" style={{ fontSize: '11px' }} />
                <YAxis width={44} tickMargin={8} stroke="#ffffff40" style={{ fontSize: '11px' }} />
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
            Hashrate stability
          </div>
          <div className="px-[5px]">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={hashrateSeries} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                <XAxis dataKey="time" stroke="#ffffff40" style={{ fontSize: '11px' }} />
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
            <BarChart3 size={16} />
            Shares submission history
          </div>
          <div className="px-[5px]">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sharesSeries} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                <XAxis dataKey="day" stroke="#ffffff40" style={{ fontSize: '11px' }} />
                <YAxis width={44} tickMargin={8} stroke="#ffffff40" style={{ fontSize: '11px' }} />
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
            Estimated vs actual earnings
          </div>
          <div className="px-[5px]">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={estimatedVsActual} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                <XAxis dataKey="label" stroke="#ffffff40" style={{ fontSize: '11px' }} />
                <YAxis width={44} tickMargin={8} stroke="#ffffff40" style={{ fontSize: '11px' }} />
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
          <div className="flex items-center justify-center gap-6 mt-3 text-xs text-white/60">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-400" />
              Estimated
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-400" />
              Actual
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
