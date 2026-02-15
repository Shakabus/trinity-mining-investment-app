'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { MarketingLiveFeedItem } from '@/components/marketing/marketingLiveFeed'

type LiveActivityItem = MarketingLiveFeedItem & {
  source?: 'approved' | 'generated'
  createdAt?: string
}

type LiveTradeRow = {
  id: string
  side: 'buy' | 'sell'
  priceUsd: number
  sizeBtc: number
  notionalUsd: number
  occurredAt: string
  eventLabel: string
}

type OrderBookRow = {
  priceUsd: number
  sizeBtc: number
  cumulativeBtc: number
}

function formatTime(value?: string) {
  if (!value) return 'Live'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Live'
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function parseUsdValue(value: string) {
  const numeric = Number(value.replace(/[^0-9.]/g, ''))
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null
}

function formatUsd(value: number) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

function formatBtc(value: number) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}

export default function LivePaymentsPageClient() {
  const [items, setItems] = useState<LiveActivityItem[]>([])
  const [trades, setTrades] = useState<LiveTradeRow[]>([])
  const [midPriceUsd, setMidPriceUsd] = useState(45950.3)

  const cursorRef = useRef(0)
  const midPriceRef = useRef(45950.3)

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

  useEffect(() => {
    const timer = window.setInterval(() => {
      const activityItem = items.length ? items[cursorRef.current % items.length] : null
      cursorRef.current += 1

      const side: LiveTradeRow['side'] = activityItem?.tone === 'withdrawal' ? 'sell' : 'buy'
      const baseMove = side === 'buy' ? 1 : -1
      const randomMove = (Math.random() - 0.5) * 8
      const directionalMove = baseMove * (Math.random() * 4.6)
      const nextPrice = Math.max(10000, Math.min(120000, midPriceRef.current + randomMove + directionalMove))

      const anchorUsd = activityItem ? parseUsdValue(activityItem.value) : null
      const resolvedNotional = anchorUsd ?? 50 + Math.random() * 249950
      const rawBtc = resolvedNotional / nextPrice
      const sizeBtc = Math.max(0.001, Math.min(8.5, Number(rawBtc.toFixed(3))))

      const trade: LiveTradeRow = {
        id: `${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        side,
        priceUsd: Number(nextPrice.toFixed(1)),
        sizeBtc,
        notionalUsd: Number((sizeBtc * nextPrice).toFixed(2)),
        occurredAt: new Date().toISOString(),
        eventLabel: activityItem ? `${activityItem.action} ${activityItem.value}` : 'live market fill',
      }

      midPriceRef.current = nextPrice
      setMidPriceUsd(Number(nextPrice.toFixed(1)))
      setTrades(previous => [trade, ...previous].slice(0, 220))
    }, 1250)

    return () => window.clearInterval(timer)
  }, [items])

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

  const { bids, asks } = useMemo(() => {
    const latest = trades.slice(0, 24)
    const avgBtc =
      latest.length > 0 ? latest.reduce((total, row) => total + row.sizeBtc, 0) / latest.length : 0.92
    const depthBase = Math.max(0.35, Math.min(4.6, avgBtc))
    const bidRows: OrderBookRow[] = []
    const askRows: OrderBookRow[] = []
    let bidCum = 0
    let askCum = 0

    for (let level = 0; level < 10; level += 1) {
      const step = 0.6 + level * 0.45
      const bidSize = Math.max(0.001, Number((depthBase * (1.18 - level * 0.06)).toFixed(3)))
      const askSize = Math.max(0.001, Number((depthBase * (1.12 - level * 0.055)).toFixed(3)))
      bidCum = Number((bidCum + bidSize).toFixed(3))
      askCum = Number((askCum + askSize).toFixed(3))

      bidRows.push({
        priceUsd: Number((midPriceUsd - step).toFixed(1)),
        sizeBtc: bidSize,
        cumulativeBtc: bidCum,
      })
      askRows.push({
        priceUsd: Number((midPriceUsd + step).toFixed(1)),
        sizeBtc: askSize,
        cumulativeBtc: askCum,
      })
    }

    return { bids: bidRows, asks: askRows.reverse() }
  }, [midPriceUsd, trades])

  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-20">
      <div
        className="rounded-3xl p-6 md:p-8"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.03))',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          backdropFilter: 'blur(18px)',
        }}
      >
        <h1 className="text-3xl md:text-4xl font-bold text-white">Live Payments Stream</h1>
        <p className="mt-3 text-sm md:text-base text-white/70">Live generator for payment and withdrawal activity.</p>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4">
            <div className="text-xs text-white/60">Approved payments</div>
            <div className="mt-1 text-2xl font-semibold text-emerald-300">{summary.approvedPayments}</div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4">
            <div className="text-xs text-white/60">Deposit events</div>
            <div className="mt-1 text-2xl font-semibold text-emerald-300">{summary.deposits}</div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4">
            <div className="text-xs text-white/60">Withdrawal events</div>
            <div className="mt-1 text-2xl font-semibold text-red-300">{summary.withdrawals}</div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4">
            <div className="text-xs text-white/60">Plan events</div>
            <div className="mt-1 text-2xl font-semibold text-sky-300">{summary.plans}</div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.45fr_1fr]">
        <div
          className="rounded-3xl p-4 md:p-6"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.02))',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
            {items.map(item => (
              <article
                key={item.id}
                className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/25 px-4 py-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-[72px] text-xs text-white/50">{formatTime(item.createdAt)}</div>
                <div className="flex-1 text-sm text-white">
                  <span className="font-semibold">{item.name}</span>
                  <span className="text-white/60"> ({item.country}) </span>
                  <span>{item.action} </span>
                  <span
                    className={
                      item.tone === 'deposit'
                        ? 'font-semibold text-emerald-300'
                        : item.tone === 'withdrawal'
                        ? 'font-semibold text-red-300'
                        : 'font-semibold text-sky-300'
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
            {items.length === 0 && <p className="p-2 text-sm text-white/60">Loading live stream...</p>}
          </div>
        </div>

        <div className="space-y-5">
          <div
            className="rounded-3xl p-4"
            style={{
              background: 'linear-gradient(150deg, rgba(255, 255, 255, 0.11), rgba(255, 255, 255, 0.02))',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <div className="text-xs uppercase tracking-[0.12em] text-white/55">Order Book</div>
            <div className="mt-3 grid grid-cols-3 text-[11px] text-white/45">
              <span>Price (USD)</span>
              <span className="text-right">Size (BTC)</span>
              <span className="text-right">Sum (BTC)</span>
            </div>

            <div className="mt-2 space-y-1">
              {asks.map(row => (
                <div key={`ask-${row.priceUsd}`} className="grid grid-cols-3 text-xs text-red-300/95">
                  <span>{row.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                  <span className="text-right">{formatBtc(row.sizeBtc)}</span>
                  <span className="text-right">{formatBtc(row.cumulativeBtc)}</span>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-center">
              <div className="text-2xl font-semibold text-emerald-300">
                {midPriceUsd.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </div>
              <div className="text-[11px] text-emerald-200/85">{formatUsd(midPriceUsd)}</div>
            </div>

            <div className="mt-3 space-y-1">
              {bids.map(row => (
                <div key={`bid-${row.priceUsd}`} className="grid grid-cols-3 text-xs text-emerald-300/95">
                  <span>{row.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                  <span className="text-right">{formatBtc(row.sizeBtc)}</span>
                  <span className="text-right">{formatBtc(row.cumulativeBtc)}</span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-3xl p-4"
            style={{
              background: 'linear-gradient(150deg, rgba(255, 255, 255, 0.11), rgba(255, 255, 255, 0.02))',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <div className="text-xs uppercase tracking-[0.12em] text-white/55">Trades</div>
            <div className="mt-3 grid grid-cols-4 text-[11px] text-white/45">
              <span>Price (USD)</span>
              <span className="text-right">Amount (BTC)</span>
              <span className="text-right">Notional</span>
              <span className="text-right">Time</span>
            </div>
            <div className="mt-2 max-h-[240px] space-y-1 overflow-y-auto pr-1">
              {trades.slice(0, 36).map(row => (
                <div key={row.id} className="grid grid-cols-4 text-xs">
                  <span className={row.side === 'buy' ? 'text-emerald-300' : 'text-red-300'}>
                    {row.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </span>
                  <span className="text-right text-white/85">{formatBtc(row.sizeBtc)}</span>
                  <span className="text-right text-white/75">{formatUsd(row.notionalUsd)}</span>
                  <span className="text-right text-white/55">{formatTime(row.occurredAt)}</span>
                </div>
              ))}
              {trades.length === 0 && <p className="py-2 text-sm text-white/55">Generating live trades...</p>}
            </div>
          </div>

          <div
            className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-xs text-white/60"
            title="Latest generator event"
          >
            Latest generator event: <span className="text-white/85">{trades[0]?.eventLabel ?? 'Waiting for feed...'}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
