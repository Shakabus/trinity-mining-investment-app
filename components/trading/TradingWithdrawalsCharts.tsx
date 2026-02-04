'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'
import { Wallet, Activity, PieChart as PieIcon } from 'lucide-react'

interface TradingWithdrawalsChartsProps {
  historySeries: { time: string; value: number }[]
  statusSeries: { name: string; value: number }[]
  balanceSeries: { time: string; value: number }[]
}

const COLORS = ['#34d399', '#60a5fa', '#fbbf24', '#f472b6']

export default function TradingWithdrawalsCharts({ historySeries, statusSeries, balanceSeries }: TradingWithdrawalsChartsProps) {
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
          <Wallet size={16} />
          Withdrawal history (USD)
        </div>
        <div className="px-[5px]">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={historySeries} margin={{ left: 5, right: 5, top: 10, bottom: 0 }}>
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
            <Bar dataKey="value" fill="#60a5fa" radius={[6, 6, 0, 0]} />
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
          <PieIcon size={16} />
          Status distribution
        </div>
        <div className="px-[5px]">
          <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={statusSeries} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4}>
              {statusSeries.map((_, index) => (
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
          <Activity size={16} />
          Available balance trend
        </div>
        <div className="px-[5px]">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={balanceSeries} margin={{ left: 5, right: 5, top: 10, bottom: 0 }}>
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
      </div>
    </div>
  )
}
