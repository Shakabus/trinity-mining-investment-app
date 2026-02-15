'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { MarketingLiveFeedItem } from '@/components/marketing/marketingLiveFeed'

type LiveActivityItem = MarketingLiveFeedItem & {
  source?: 'approved' | 'generated'
  createdAt?: string
}

type CompanyFlowRow = {
  id: string
  name: string
  direction: 'inflow' | 'outflow'
  amountUsd: number
  totalUsd: number
  occurredAt: string
  eventLabel: string
}

const MIN_COMPANY_TOTAL_USD = 515_000_000
const MAX_COMPANY_TOTAL_USD = 575_000_000
const TARGET_NAME_POOL = 2000
const FLOW_BATCH_SIZE = 3
const LIVE_STREAM_STATE_KEY = 'live_payment_stream_state_v1'
const MAX_PERSISTED_FLOWS = 220

const SYNTHETIC_FIRST_NAMES = [
  'Liam', 'Noah', 'Oliver', 'Elijah', 'James', 'William', 'Benjamin', 'Lucas', 'Henry', 'Alexander',
  'Mason', 'Michael', 'Ethan', 'Daniel', 'Jacob', 'Logan', 'Jackson', 'Levi', 'Sebastian', 'Mateo',
  'Jack', 'Owen', 'Theodore', 'Aiden', 'Samuel', 'Joseph', 'John', 'David', 'Wyatt', 'Matthew',
  'Luke', 'Asher', 'Carter', 'Julian', 'Grayson', 'Leo', 'Jayden', 'Gabriel', 'Isaac', 'Lincoln',
  'Anthony', 'Hudson', 'Dylan', 'Ezra', 'Thomas', 'Charles', 'Christopher', 'Jaxon', 'Maverick', 'Josiah',
]

const SYNTHETIC_LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
]

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

function firstNameOf(fullName: string) {
  const parts = fullName.trim().split(/\s+/)
  return parts[0]?.toLowerCase() ?? ''
}

function surnameOf(fullName: string) {
  const parts = fullName.trim().split(/\s+/)
  while (parts.length > 1 && /^(\d+|[ivxlcdm]+)$/i.test(parts[parts.length - 1])) {
    parts.pop()
  }
  return parts[parts.length - 1]?.toLowerCase() ?? ''
}

function hashString(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

function alphaTag(value: number) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let remaining = value
  let tag = ''
  while (remaining > 0) {
    remaining -= 1
    tag = alphabet[remaining % 26] + tag
    remaining = Math.floor(remaining / 26)
  }
  return tag
}

function disperseBySurname(names: string[]) {
  const buckets = new Map<string, string[]>()

  for (const name of names) {
    const surname = surnameOf(name)
    const bucket = buckets.get(surname)
    if (bucket) {
      bucket.push(name)
    } else {
      buckets.set(surname, [name])
    }
  }

  for (const [surname, bucket] of buckets) {
    bucket.sort((left, right) => {
      return hashString(`${surname}:${left}`) - hashString(`${surname}:${right}`)
    })
  }

  const ordered: string[] = []
  let previousSurname = ''

  while (buckets.size > 0) {
    let selectedSurname = ''
    let selectedCount = -1

    for (const [surname, bucket] of buckets) {
      if (bucket.length <= 0) continue
      if (surname === previousSurname && buckets.size > 1) continue
      if (bucket.length > selectedCount) {
        selectedSurname = surname
        selectedCount = bucket.length
      }
    }

    // Fallback when only one surname bucket remains.
    if (!selectedSurname) {
      for (const [surname, bucket] of buckets) {
        if (bucket.length > selectedCount) {
          selectedSurname = surname
          selectedCount = bucket.length
        }
      }
    }

    const selectedBucket = buckets.get(selectedSurname)
    if (!selectedBucket || selectedBucket.length === 0) break

    const nextName = selectedBucket.shift()
    if (nextName) {
      ordered.push(nextName)
      previousSurname = selectedSurname
    }

    if (selectedBucket.length === 0) {
      buckets.delete(selectedSurname)
    }
  }

  return ordered
}

function buildExpandedNamePool(baseNames: string[], target: number) {
  const uniqueNames = new Set<string>()

  for (const name of baseNames) {
    const trimmed = name.trim()
    if (trimmed) uniqueNames.add(trimmed)
    if (uniqueNames.size >= target) {
      return Array.from(uniqueNames).slice(0, target)
    }
  }

  let firstIndex = 0
  let lastIndex = 0
  let cycle = 0

  while (uniqueNames.size < target) {
    const first = SYNTHETIC_FIRST_NAMES[firstIndex % SYNTHETIC_FIRST_NAMES.length]
    const last = SYNTHETIC_LAST_NAMES[lastIndex % SYNTHETIC_LAST_NAMES.length]
    const marker = cycle > 0 ? ` ${alphaTag(cycle)}` : ''
    uniqueNames.add(`${first}${marker} ${last}`)

    firstIndex += 1
    if (firstIndex % SYNTHETIC_FIRST_NAMES.length === 0) {
      lastIndex += 1
      if (lastIndex % SYNTHETIC_LAST_NAMES.length === 0) {
        cycle += 1
      }
    }
  }

  return disperseBySurname(Array.from(uniqueNames)).slice(0, target)
}

type PersistedStreamState = {
  companyTotalUsd: number
  cursor: number
  nameCursor: number
  lastSurnameInflow: string
  lastSurnameOutflow: string
  lastFirstInflow: string
  lastFirstOutflow: string
  lastGlobalFirst: string
  recentGlobalFirsts: string[]
  recentInflowFirsts: string[]
  recentOutflowFirsts: string[]
  flows: CompanyFlowRow[]
}

function readPersistedStreamState() {
  if (typeof window === 'undefined') return null
  try {
    const rawValue = window.localStorage.getItem(LIVE_STREAM_STATE_KEY)
    if (!rawValue) return null
    const parsed = JSON.parse(rawValue) as Partial<PersistedStreamState>
    if (!parsed || typeof parsed !== 'object') return null

    const safeTotal =
      typeof parsed.companyTotalUsd === 'number' && Number.isFinite(parsed.companyTotalUsd)
        ? Math.max(MIN_COMPANY_TOTAL_USD, Math.min(MAX_COMPANY_TOTAL_USD, parsed.companyTotalUsd))
        : null
    if (safeTotal === null) return null

    const safeFlows: CompanyFlowRow[] = Array.isArray(parsed.flows)
      ? parsed.flows
          .filter(flow => flow && typeof flow === 'object')
          .map((flow): CompanyFlowRow => ({
            id: String(flow.id ?? `${Date.now()}-${Math.random()}`),
            name: String(flow.name ?? 'Member'),
            direction: flow.direction === 'outflow' ? 'outflow' : 'inflow',
            amountUsd:
              typeof flow.amountUsd === 'number' && Number.isFinite(flow.amountUsd) ? flow.amountUsd : 250000,
            totalUsd:
              typeof flow.totalUsd === 'number' && Number.isFinite(flow.totalUsd) ? flow.totalUsd : safeTotal,
            occurredAt: String(flow.occurredAt ?? new Date().toISOString()),
            eventLabel: String(flow.eventLabel ?? 'automated treasury transfer'),
          }))
          .slice(0, MAX_PERSISTED_FLOWS)
      : []

    const safeList = (value: unknown, maxSize: number) =>
      Array.isArray(value)
        ? value
            .map(entry => String(entry))
            .filter(entry => entry.length > 0)
            .slice(0, maxSize)
        : []

    return {
      companyTotalUsd: safeTotal,
      cursor:
        typeof parsed.cursor === 'number' && Number.isFinite(parsed.cursor) && parsed.cursor >= 0
          ? Math.floor(parsed.cursor)
          : 0,
      nameCursor:
        typeof parsed.nameCursor === 'number' && Number.isFinite(parsed.nameCursor) && parsed.nameCursor >= 0
          ? Math.floor(parsed.nameCursor)
          : 0,
      lastSurnameInflow: String(parsed.lastSurnameInflow ?? ''),
      lastSurnameOutflow: String(parsed.lastSurnameOutflow ?? ''),
      lastFirstInflow: String(parsed.lastFirstInflow ?? ''),
      lastFirstOutflow: String(parsed.lastFirstOutflow ?? ''),
      lastGlobalFirst: String(parsed.lastGlobalFirst ?? ''),
      recentGlobalFirsts: safeList(parsed.recentGlobalFirsts, 10),
      recentInflowFirsts: safeList(parsed.recentInflowFirsts, 4),
      recentOutflowFirsts: safeList(parsed.recentOutflowFirsts, 4),
      flows: safeFlows,
    } satisfies PersistedStreamState
  } catch {
    return null
  }
}

function writePersistedStreamState(state: PersistedStreamState) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LIVE_STREAM_STATE_KEY, JSON.stringify(state))
  } catch {
    // Ignore persistence errors; live stream should continue in-memory.
  }
}

export default function LivePaymentsPageClient() {
  const [items, setItems] = useState<LiveActivityItem[]>([])
  const [flows, setFlows] = useState<CompanyFlowRow[]>([])
  const [companyTotalUsd, setCompanyTotalUsd] = useState(537_300_000)
  const [streamReady, setStreamReady] = useState(false)

  const cursorRef = useRef(0)
  const nameCursorRef = useRef(0)
  const totalRef = useRef(537_300_000)
  const lastSurnameByDirectionRef = useRef<{ inflow: string; outflow: string }>({
    inflow: '',
    outflow: '',
  })
  const lastFirstByDirectionRef = useRef<{ inflow: string; outflow: string }>({
    inflow: '',
    outflow: '',
  })
  const lastGlobalFirstRef = useRef('')
  const recentGlobalFirstsRef = useRef<string[]>([])
  const recentDirectionFirstsRef = useRef<{ inflow: string[]; outflow: string[] }>({
    inflow: [],
    outflow: [],
  })

  useEffect(() => {
    let cancelled = false

    const fetchFeed = async () => {
      try {
        const response = await fetch('/api/public/live-activity?limit=160', { cache: 'no-store' })
        if (!response.ok) return
        const data = (await response.json()) as { items?: LiveActivityItem[] }
        if (cancelled) return
        setItems(Array.isArray(data.items) ? data.items : [])
      } catch {
        if (!cancelled) setItems([])
      }
    }

    fetchFeed()
    const timer = window.setInterval(fetchFeed, 4000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  const namePool = useMemo(() => buildExpandedNamePool(items.map(item => item.name), TARGET_NAME_POOL), [items])

  useEffect(() => {
    const hydrateTimer = window.setTimeout(() => {
      const persistedState = readPersistedStreamState()
      if (persistedState) {
        setCompanyTotalUsd(persistedState.companyTotalUsd)
        setFlows(persistedState.flows)
        cursorRef.current = persistedState.cursor
        nameCursorRef.current = persistedState.nameCursor
        totalRef.current = persistedState.companyTotalUsd
        lastSurnameByDirectionRef.current = {
          inflow: persistedState.lastSurnameInflow,
          outflow: persistedState.lastSurnameOutflow,
        }
        lastFirstByDirectionRef.current = {
          inflow: persistedState.lastFirstInflow,
          outflow: persistedState.lastFirstOutflow,
        }
        lastGlobalFirstRef.current = persistedState.lastGlobalFirst
        recentGlobalFirstsRef.current = persistedState.recentGlobalFirsts
        recentDirectionFirstsRef.current = {
          inflow: persistedState.recentInflowFirsts,
          outflow: persistedState.recentOutflowFirsts,
        }
      }
      setStreamReady(true)
    }, 0)

    return () => window.clearTimeout(hydrateTimer)
  }, [])

  useEffect(() => {
    if (!streamReady) return
    writePersistedStreamState({
      companyTotalUsd,
      cursor: cursorRef.current,
      nameCursor: nameCursorRef.current,
      lastSurnameInflow: lastSurnameByDirectionRef.current.inflow,
      lastSurnameOutflow: lastSurnameByDirectionRef.current.outflow,
      lastFirstInflow: lastFirstByDirectionRef.current.inflow,
      lastFirstOutflow: lastFirstByDirectionRef.current.outflow,
      lastGlobalFirst: lastGlobalFirstRef.current,
      recentGlobalFirsts: recentGlobalFirstsRef.current,
      recentInflowFirsts: recentDirectionFirstsRef.current.inflow,
      recentOutflowFirsts: recentDirectionFirstsRef.current.outflow,
      flows: flows.slice(0, MAX_PERSISTED_FLOWS),
    })
  }, [companyTotalUsd, flows, streamReady])

  useEffect(() => {
    if (!streamReady) return

    const timer = window.setInterval(() => {
      const nextBatch: CompanyFlowRow[] = []

      const pushRecent = (history: string[], value: string, size: number) => {
        if (!value) return
        history.unshift(value)
        if (history.length > size) {
          history.length = size
        }
      }

      const pickNameForDirection = (
        direction: CompanyFlowRow['direction'],
        fallbackName: string
      ) => {
        if (!namePool.length) return fallbackName

        const start = nameCursorRef.current % namePool.length
        const previousSurname = lastSurnameByDirectionRef.current[direction]
        const previousFirstByDirection = lastFirstByDirectionRef.current[direction]
        const previousGlobalFirst = lastGlobalFirstRef.current
        const recentGlobalFirsts = recentGlobalFirstsRef.current
        const recentDirectionFirsts = recentDirectionFirstsRef.current[direction]

        for (let offset = 0; offset < namePool.length; offset += 1) {
          const candidateIndex = (start + offset) % namePool.length
          const candidate = namePool[candidateIndex]
          const candidateSurname = surnameOf(candidate)
          const candidateFirst = firstNameOf(candidate)
          if (namePool.length > 1 && candidateSurname === previousSurname) continue
          if (namePool.length > 2 && candidateFirst === previousFirstByDirection) continue
          if (namePool.length > 3 && candidateFirst === previousGlobalFirst) continue
          if (namePool.length > 20 && recentDirectionFirsts.includes(candidateFirst)) continue
          if (namePool.length > 40 && recentGlobalFirsts.includes(candidateFirst)) continue

          nameCursorRef.current = (candidateIndex + 1) % namePool.length
          lastSurnameByDirectionRef.current[direction] = candidateSurname
          lastFirstByDirectionRef.current[direction] = candidateFirst
          lastGlobalFirstRef.current = candidateFirst
          pushRecent(recentDirectionFirsts, candidateFirst, 4)
          pushRecent(recentGlobalFirsts, candidateFirst, 10)
          return candidate
        }

        // Relax constraints if the strict pass filtered too aggressively.
        for (let offset = 0; offset < namePool.length; offset += 1) {
          const candidateIndex = (start + offset) % namePool.length
          const candidate = namePool[candidateIndex]
          const candidateSurname = surnameOf(candidate)
          const candidateFirst = firstNameOf(candidate)
          if (namePool.length > 1 && candidateSurname === previousSurname) continue
          if (namePool.length > 2 && candidateFirst === previousFirstByDirection) continue

          nameCursorRef.current = (candidateIndex + 1) % namePool.length
          lastSurnameByDirectionRef.current[direction] = candidateSurname
          lastFirstByDirectionRef.current[direction] = candidateFirst
          lastGlobalFirstRef.current = candidateFirst
          pushRecent(recentDirectionFirsts, candidateFirst, 4)
          pushRecent(recentGlobalFirsts, candidateFirst, 10)
          return candidate
        }

        const fallbackCandidate = namePool[start]
        nameCursorRef.current = (start + 1) % namePool.length
        lastSurnameByDirectionRef.current[direction] = surnameOf(fallbackCandidate)
        lastFirstByDirectionRef.current[direction] = firstNameOf(fallbackCandidate)
        lastGlobalFirstRef.current = firstNameOf(fallbackCandidate)
        pushRecent(recentDirectionFirsts, firstNameOf(fallbackCandidate), 4)
        pushRecent(recentGlobalFirsts, firstNameOf(fallbackCandidate), 10)
        return fallbackCandidate
      }

      for (let step = 0; step < FLOW_BATCH_SIZE; step += 1) {
        const sequence = cursorRef.current
        const activityItem = items.length ? items[sequence % items.length] : null
        cursorRef.current += 1

        const sourceAmount = activityItem ? parseUsdValue(activityItem.value) : null
        const scaledAmount = sourceAmount
          ? Math.max(250_000, Math.min(6_500_000, sourceAmount * (sourceAmount < 300_000 ? 12 : 6)))
          : 250_000 + Math.random() * 5_250_000

        let direction: CompanyFlowRow['direction'] = activityItem?.tone === 'withdrawal' ? 'outflow' : 'inflow'
        if (totalRef.current <= MIN_COMPANY_TOTAL_USD + 1_500_000) direction = 'inflow'
        if (totalRef.current >= MAX_COMPANY_TOTAL_USD - 1_500_000) direction = 'outflow'

        const signedAmount = direction === 'inflow' ? scaledAmount : -scaledAmount
        const nextTotal = Math.max(
          MIN_COMPANY_TOTAL_USD,
          Math.min(MAX_COMPANY_TOTAL_USD, totalRef.current + signedAmount)
        )
        totalRef.current = nextTotal

        const fallbackName = activityItem?.name ?? `Member ${sequence + 1}`
        const name = pickNameForDirection(direction, fallbackName)
        const eventLabel = activityItem ? `${activityItem.action} ${activityItem.value}` : 'automated treasury transfer'

        nextBatch.push({
          id: `${Date.now()}-${step}-${Math.floor(Math.random() * 100000)}`,
          name,
          direction,
          amountUsd: Math.round(scaledAmount),
          totalUsd: nextTotal,
          occurredAt: new Date().toISOString(),
          eventLabel,
        })
      }

      setCompanyTotalUsd(totalRef.current)
      setFlows(previous => [...nextBatch.reverse(), ...previous].slice(0, 300))
    }, 1100)

    return () => window.clearInterval(timer)
  }, [items, namePool, streamReady])

  const liveMetrics = useMemo(() => {
    let approvedUsd = 0
    let feedInflowUsd = 0
    let feedOutflowUsd = 0

    for (const item of items) {
      const parsed = parseUsdValue(item.value)
      if (!parsed) continue
      if (item.tone === 'deposit') feedInflowUsd += parsed
      if (item.tone === 'withdrawal') feedOutflowUsd += parsed
      if (item.source === 'approved') approvedUsd += parsed
    }

    let generatedInflowUsd = 0
    let generatedOutflowUsd = 0

    for (const flow of flows) {
      if (flow.direction === 'inflow') generatedInflowUsd += flow.amountUsd
      if (flow.direction === 'outflow') generatedOutflowUsd += flow.amountUsd
    }

    return {
      approvedUsd,
      feedInflowUsd,
      feedOutflowUsd,
      generatedInflowUsd,
      generatedOutflowUsd,
    }
  }, [flows, items])

  const payoutRows = useMemo(() => flows.filter(flow => flow.direction === 'outflow').slice(0, 9), [flows])
  const receiptRows = useMemo(() => flows.filter(flow => flow.direction === 'inflow').slice(0, 9), [flows])
  const summaryDisplay = useMemo(() => {
    const sourceApproved = Math.max(1, liveMetrics.approvedUsd)
    const sourceInflow = Math.max(1, liveMetrics.feedInflowUsd + liveMetrics.generatedInflowUsd)
    const sourceOutflow = Math.max(1, liveMetrics.feedOutflowUsd + liveMetrics.generatedOutflowUsd)

    // Keep ratios live-driven but anchored so all three values stay substantial.
    const approvedWeight = sourceApproved + companyTotalUsd * 0.18
    const inflowWeight = sourceInflow + companyTotalUsd * 0.41
    const outflowWeight = sourceOutflow + companyTotalUsd * 0.41
    const totalWeight = approvedWeight + inflowWeight + outflowWeight

    const approvedUsd = Math.round((companyTotalUsd * approvedWeight) / totalWeight)
    const inflowUsd = Math.round((companyTotalUsd * inflowWeight) / totalWeight)
    const outflowUsd = Math.max(0, Math.round(companyTotalUsd - approvedUsd - inflowUsd))

    return { approvedUsd, inflowUsd, outflowUsd }
  }, [companyTotalUsd, liveMetrics])

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
        <h1 className="text-3xl font-bold text-white md:text-4xl">Live Payments Stream</h1>
        <p className="mt-3 text-sm text-white/70 md:text-base">Live generator for payment and withdrawal activity.</p>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4">
            <div className="text-xs text-white/60">Approved payment value</div>
            <div className="mt-1 text-2xl font-semibold text-emerald-300">{formatUsd(summaryDisplay.approvedUsd)}</div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4">
            <div className="text-xs text-white/60">Feed inflow processed</div>
            <div className="mt-1 text-2xl font-semibold text-emerald-300">{formatUsd(summaryDisplay.inflowUsd)}</div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4">
            <div className="text-xs text-white/60">Feed outflow processed</div>
            <div className="mt-1 text-2xl font-semibold text-red-300">{formatUsd(summaryDisplay.outflowUsd)}</div>
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
            <div className="text-xs uppercase tracking-[0.12em] text-white/55">Transfer Book</div>
            <div className="mt-3 grid grid-cols-[1.2fr_1fr] text-[11px] text-white/45">
              <span>Name</span>
              <span className="text-right">Amount (USD)</span>
            </div>

            <div className="mt-2 space-y-1">
              {payoutRows.map(row => (
                <div key={row.id} className="grid grid-cols-[1.2fr_1fr] text-xs text-red-300/95">
                  <span className="truncate pr-2">{row.name}</span>
                  <span className="text-right">{formatUsd(row.amountUsd)}</span>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-center">
              <div className="text-2xl font-semibold text-emerald-300">{formatUsd(companyTotalUsd)}</div>
              <div className="text-[11px] text-emerald-200/85">Company transfer total</div>
            </div>

            <div className="mt-3 space-y-1">
              {receiptRows.map(row => (
                <div key={row.id} className="grid grid-cols-[1.2fr_1fr] text-xs text-emerald-300/95">
                  <span className="truncate pr-2">{row.name}</span>
                  <span className="text-right">{formatUsd(row.amountUsd)}</span>
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
            <div className="text-xs uppercase tracking-[0.12em] text-white/55">Live Company Transfers</div>
            <div className="mt-3 grid grid-cols-[1.1fr_auto_auto] text-[11px] text-white/45">
              <span>Name</span>
              <span className="text-right">Direction</span>
              <span className="text-right">Time</span>
            </div>
            <div className="mt-2 max-h-[240px] space-y-1 overflow-y-auto pr-1">
              {flows.slice(0, 36).map(flow => (
                <div key={flow.id} className="grid grid-cols-[1.1fr_auto_auto] text-xs">
                  <span className="truncate pr-2 text-white/90">{flow.name}</span>
                  <span className={flow.direction === 'inflow' ? 'text-right text-emerald-300' : 'text-right text-red-300'}>
                    {flow.direction === 'inflow' ? 'Received' : 'Paid'}
                  </span>
                  <span className="text-right text-white/55">{formatTime(flow.occurredAt)}</span>
                </div>
              ))}
              {flows.length === 0 && <p className="py-2 text-sm text-white/55">Generating live transfers...</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-xs text-white/60">
            Latest generator event: <span className="text-white/85">{flows[0]?.eventLabel ?? 'Waiting for feed...'}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
