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
import { DollarSign, TrendingUp, Scale } from 'lucide-react'

interface TradingEarningsChartsProps {
  earningsSeries: { time: string; value: number }[]
  estimateSeries: { label: string; estimated: number; actual: number }[]
  drawdownSeries: { time: string; value: number }[]
}

export default function TradingEarningsCharts({ earningsSeries, estimateSeries, drawdownSeries }: TradingEarningsChartsProps) {
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
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={earningsSeries}>
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
          <Scale size={16} />
          Estimated vs actual
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={estimateSeries}>
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
            <Bar dataKey="estimated" fill="#60a5fa" radius={[6, 6, 0, 0]} />
            <Bar dataKey="actual" fill="#10b981" radius={[6, 6, 0, 0]} />
          </BarChart>
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
          Drawdown & recovery
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={drawdownSeries}>
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
            <Line type="monotone" dataKey="value" stroke="#fbbf24" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
