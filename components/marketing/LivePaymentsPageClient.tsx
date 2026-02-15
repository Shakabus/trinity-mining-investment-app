'use client'

import { useEffect, useMemo, useState } from 'react'
import type { MarketingLiveFeedItem } from '@/components/marketing/marketingLiveFeed'

type LiveActivityItem = MarketingLiveFeedItem & {
  source?: 'approved' | 'generated'
  createdAt?: string
}

function formatTime(value?: string) {
  if (!value) return 'Live'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Live'
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function LivePaymentsPageClient() {
  const [items, setItems] = useState<LiveActivityItem[]>([])

  useEffect(() => {
    let cancelled = false

    const fetchFeed = async () => {
      try {
        const response = await fetch('/api/public/live-activity?limit=120', { cache: 'no-store' })
        if (!response.ok) return
        const data = (await response.json()) as { items?: LiveActivityItem[] }
        if (cancelled) return
        setItems(Array.isArray(data.items) ? data.items : [])
      } catch {
        if (!cancelled) {
          setItems([])
        }
      }
    }

    fetchFeed()
    const timer = window.setInterval(fetchFeed, 4000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  const summary = useMemo(() => {
    let deposits = 0
    let withdrawals = 0
    let plans = 0
    let approvedPayments = 0

    for (const item of items) {
      if (item.tone === 'deposit') deposits += 1
      if (item.tone === 'withdrawal') withdrawals += 1
      if (item.tone === 'plan') plans += 1
      if (item.source === 'approved') approvedPayments += 1
    }

    return { deposits, withdrawals, plans, approvedPayments }
  }, [items])

  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-16">
      <div
        className="rounded-3xl p-6 md:p-8"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.03))',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          backdropFilter: 'blur(18px)',
        }}
      >
        <h1 className="text-3xl md:text-4xl font-bold text-white">Live Payments Stream</h1>
        <p className="mt-3 text-sm md:text-base text-white/70">
          This page powers ticker tape and bell notifications. Approved payments publish here first, then flow
          platform-wide after the 7-second release window.
        </p>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-2xl p-4 border border-white/15 bg-white/[0.04]">
            <div className="text-xs text-white/60">Approved payments</div>
            <div className="mt-1 text-2xl font-semibold text-emerald-300">{summary.approvedPayments}</div>
          </div>
          <div className="rounded-2xl p-4 border border-white/15 bg-white/[0.04]">
            <div className="text-xs text-white/60">Deposit events</div>
            <div className="mt-1 text-2xl font-semibold text-emerald-300">{summary.deposits}</div>
          </div>
          <div className="rounded-2xl p-4 border border-white/15 bg-white/[0.04]">
            <div className="text-xs text-white/60">Withdrawal events</div>
            <div className="mt-1 text-2xl font-semibold text-red-300">{summary.withdrawals}</div>
          </div>
          <div className="rounded-2xl p-4 border border-white/15 bg-white/[0.04]">
            <div className="text-xs text-white/60">Plan events</div>
            <div className="mt-1 text-2xl font-semibold text-sky-300">{summary.plans}</div>
          </div>
        </div>
      </div>

      <div
        className="mt-6 rounded-3xl p-4 md:p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.02))',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="max-h-[620px] overflow-y-auto pr-1 space-y-2">
          {items.map(item => (
            <article
              key={item.id}
              className="rounded-xl px-4 py-3 border border-white/10 bg-black/25 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
            >
              <div className="text-xs text-white/50 min-w-[72px]">{formatTime(item.createdAt)}</div>
              <div className="text-sm text-white flex-1">
                <span className="font-semibold">{item.name}</span>
                <span className="text-white/60"> ({item.country}) </span>
                <span>{item.action} </span>
                <span
                  className={
                    item.tone === 'deposit'
                      ? 'text-emerald-300 font-semibold'
                      : item.tone === 'withdrawal'
                      ? 'text-red-300 font-semibold'
                      : 'text-sky-300 font-semibold'
                  }
                >
                  {item.value}
                </span>
              </div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-white/45">
                {item.source === 'approved' ? 'Approved' : 'Stream'}
              </div>
            </article>
          ))}
          {items.length === 0 && <p className="text-sm text-white/60 p-2">Loading live stream…</p>}
        </div>
      </div>
    </section>
  )
}

