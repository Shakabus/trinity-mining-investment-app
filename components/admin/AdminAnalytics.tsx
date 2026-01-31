'use client'

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
import { TrendingUp, Users, Activity, PieChart as PieIcon } from 'lucide-react'

type SeriesPoint = { date: string; value: number }
type PlanSlice = { name: string; count: number }

const RANGE_OPTIONS = [7, 30, 90]

const COLORS = ['#60a5fa', '#34d399', '#f59e0b', '#a78bfa', '#f87171', '#22d3ee']

export default function AdminAnalytics() {
  const [range, setRange] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<{
    revenueSeries: SeriesPoint[]
    newUsersSeries: SeriesPoint[]
    activeUsersSeries: SeriesPoint[]
    planPopularity: PlanSlice[]
    approvals: { confirmed: number; total: number; rate: number }
  } | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)
    fetch(`/api/admin/analytics?range=${range}`, { cache: 'no-store' })
      .then(async res => {
        const payload = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(payload?.error || 'Failed to load analytics.')
        }
        return payload
      })
      .then(payload => {
        if (!mounted) return
        setData({
          revenueSeries: Array.isArray(payload?.revenueSeries) ? payload.revenueSeries : [],
          newUsersSeries: Array.isArray(payload?.newUsersSeries) ? payload.newUsersSeries : [],
          activeUsersSeries: Array.isArray(payload?.activeUsersSeries) ? payload.activeUsersSeries : [],
          planPopularity: Array.isArray(payload?.planPopularity) ? payload.planPopularity : [],
          approvals: payload?.approvals || { confirmed: 0, total: 0, rate: 0 },
        })
      })
      .catch((err: Error) => {
        if (!mounted) return
        setError(err.message || 'Failed to load analytics.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [range])

  const rangeLabel = useMemo(() => `${range} days`, [range])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white">Analytics</h2>
          <p className="text-white/60 text-sm">Real-time platform insights from confirmed data.</p>
        </div>
        <div className="flex items-center gap-2">
          {RANGE_OPTIONS.map(option => (
            <button
              key={option}
              onClick={() => setRange(option)}
              className="px-3 py-2 rounded-full text-xs font-semibold transition-all"
              style={{
                background: option === range ? 'rgba(88,45,255,0.35)' : 'rgba(255,255,255,0.08)',
                border: option === range ? '1px solid rgba(88,45,255,0.6)' : '1px solid rgba(255,255,255,0.15)',
                color: '#ffffff',
              }}
            >
              {option}d
            </button>
          ))}
        </div>
      </div>

      {loading || !data ? (
        <div
          className="p-10 rounded-3xl text-center text-white/70"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            border: '1px solid rgba(255,255,255,0.18)',
          }}
        >
          {error ? error : `Loading analytics for ${rangeLabel}...`}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
              Revenue (confirmed) - {rangeLabel}
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.revenueSeries}>
                <XAxis dataKey="date" stroke="#ffffff40" style={{ fontSize: '11px' }} />
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
              <Users size={16} />
              New Users - {rangeLabel}
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.newUsersSeries}>
                <XAxis dataKey="date" stroke="#ffffff40" style={{ fontSize: '11px' }} />
                <YAxis stroke="#ffffff40" style={{ fontSize: '11px' }} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(0, 0, 0, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="value" fill="#34d399" radius={[6, 6, 0, 0]} />
              </BarChart>
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
              Active Users Trend - {rangeLabel}
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.activeUsersSeries}>
                <XAxis dataKey="date" stroke="#ffffff40" style={{ fontSize: '11px' }} />
                <YAxis stroke="#ffffff40" style={{ fontSize: '11px' }} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(0, 0, 0, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Line type="monotone" dataKey="value" stroke="#a78bfa" strokeWidth={2} dot={false} />
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
              <PieIcon size={16} />
              Plan Popularity
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={data.planPopularity} dataKey="count" nameKey="name" outerRadius={90}>
                  {data.planPopularity.map((entry, idx) => (
                    <Cell key={entry.name} fill={COLORS[idx % COLORS.length]} />
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
      )}

      {data && (
        <div
          className="p-4 rounded-2xl flex items-center justify-between text-sm text-white/70"
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          <div>
            Payment approval rate: <span className="text-white font-semibold">{data.approvals.rate}%</span>
          </div>
          <div>
            {data.approvals.confirmed} approved / {data.approvals.total} total
          </div>
        </div>
      )}
    </div>
  )
}
