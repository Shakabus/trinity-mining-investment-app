'use client'

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
} from 'recharts'
import { Activity, TrendingUp, PieChart } from 'lucide-react'

interface TradingBotChartsProps {
  priceSeries: { time: string; value: number }[]
  pnlSeries: { time: string; value: number }[]
  volumeSeries: { time: string; value: number }[]
}

export default function TradingBotCharts({ priceSeries, pnlSeries, volumeSeries }: TradingBotChartsProps) {
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
            <Area type="monotone" dataKey="value" stroke="#34d399" fill="rgba(52, 211, 153, 0.25)" />
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
            <Bar dataKey="value" fill="#a78bfa" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
