'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { generateMarketingLiveFeed, type MarketingLiveFeedItem } from '@/components/marketing/marketingLiveFeed'

const BASE_FEED_COUNT = 1000
const DEFAULT_INITIAL_MIN_DELAY_MS = 2000
const DEFAULT_INITIAL_MAX_DELAY_MS = 4000
const DEFAULT_MIN_INTERVAL_MS = 2000
const DEFAULT_MAX_INTERVAL_MS = 4000
const BELL_PHASE_MS = 900
const EXIT_PHASE_MS = 550
const LIVE_FEED_POLL_INTERVAL_MS = 15000

type AlertPhase = 'hidden' | 'bell' | 'open' | 'closing'

type MarketingWithdrawalAlertProps = {
  minIntervalMs?: number
  maxIntervalMs?: number
  initialMinDelayMs?: number
  initialMaxDelayMs?: number
  title?: string
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle<T>(items: T[]) {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const temp = next[index]
    next[index] = next[swapIndex]
    next[swapIndex] = temp
  }
  return next
}

export default function MarketingWithdrawalAlert({
  minIntervalMs = DEFAULT_MIN_INTERVAL_MS,
  maxIntervalMs = DEFAULT_MAX_INTERVAL_MS,
  initialMinDelayMs = DEFAULT_INITIAL_MIN_DELAY_MS,
  initialMaxDelayMs = DEFAULT_INITIAL_MAX_DELAY_MS,
  title,
}: MarketingWithdrawalAlertProps) {
  const [phase, setPhase] = useState<AlertPhase>('hidden')
  const [alertItem, setAlertItem] = useState<MarketingLiveFeedItem | null>(null)
  const timersRef = useRef<number[]>([])
  const queueRef = useRef<MarketingLiveFeedItem[]>([])
  const priorityQueueRef = useRef<MarketingLiveFeedItem[]>([])
  const seenIdsRef = useRef<Set<string>>(new Set())
  const queueIndexRef = useRef(0)
  const pollTimerRef = useRef<number | null>(null)

  const fallbackItems = useMemo(
    () =>
      generateMarketingLiveFeed(BASE_FEED_COUNT).filter(
        item => item.tone === 'withdrawal' || item.tone === 'deposit'
      ),
    []
  )

  useEffect(() => {
    queueRef.current = shuffle(fallbackItems)
    queueIndexRef.current = 0
  }, [fallbackItems])

  useEffect(() => {
    let cancelled = false

    const pullLiveFeed = async () => {
      try {
        const response = await fetch('/api/public/live-activity?limit=30', { cache: 'no-store' })
        if (!response.ok) return
        const data = (await response.json()) as { items?: MarketingLiveFeedItem[] }
        if (cancelled || !Array.isArray(data.items)) return
        const filtered = data.items.filter(item => item.tone === 'withdrawal' || item.tone === 'deposit')

        for (const item of filtered) {
          if (seenIdsRef.current.has(item.id)) continue
          seenIdsRef.current.add(item.id)
          priorityQueueRef.current.push(item)
        }
      } catch {
        // Keep fallback queue running if polling fails.
      }
    }

    pullLiveFeed()
    pollTimerRef.current = window.setInterval(pullLiveFeed, LIVE_FEED_POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const clearTimers = () => {
      for (const timer of timersRef.current) {
        window.clearTimeout(timer)
      }
      timersRef.current = []
    }

    const nextItem = () => {
      const priority = priorityQueueRef.current.shift()
      if (priority) return priority

      if (queueRef.current.length === 0) return null
      if (queueIndexRef.current >= queueRef.current.length) {
        queueRef.current = shuffle(queueRef.current)
        queueIndexRef.current = 0
      }

      const item = queueRef.current[queueIndexRef.current]
      queueIndexRef.current += 1
      return item
    }

    const scheduleNext = (delay: number) => {
      const timer = window.setTimeout(() => {
        const item = nextItem()
        if (!item) return

        setAlertItem(item)
        setPhase('bell')

        const openTimer = window.setTimeout(() => {
          setPhase('open')
        }, BELL_PHASE_MS)

        const visibleDuration = randomBetween(3000, 4000)
        const closeTimer = window.setTimeout(() => {
          setPhase('closing')
        }, BELL_PHASE_MS + visibleDuration)

        const resetTimer = window.setTimeout(() => {
          setPhase('hidden')
          scheduleNext(randomBetween(minIntervalMs, maxIntervalMs))
        }, BELL_PHASE_MS + visibleDuration + EXIT_PHASE_MS)

        timersRef.current.push(openTimer, closeTimer, resetTimer)
      }, delay)

      timersRef.current.push(timer)
    }

    scheduleNext(randomBetween(initialMinDelayMs, initialMaxDelayMs))
    return clearTimers
  }, [initialMaxDelayMs, initialMinDelayMs, maxIntervalMs, minIntervalMs])

  if (!alertItem) return null

  const isVisible = phase !== 'hidden'
  const isExpanded = phase === 'open' || phase === 'closing'
  const isClosing = phase === 'closing'
  const alertTone = alertItem.tone === 'deposit' ? 'deposit' : 'withdrawal'
  const resolvedTitle = title ?? (alertTone === 'deposit' ? 'Live deposit' : 'Live payout')

  return (
    <div
      className={`bitryx-withdraw-alert tone-${alertTone} ${isVisible ? 'is-visible' : ''} ${
        isExpanded ? 'is-expanded' : ''
      } ${isClosing ? 'is-closing' : ''}`}
      aria-hidden="true"
    >
      <div className={`bitryx-withdraw-alert__bell ${phase === 'bell' ? 'is-ringing' : ''}`}>
        <Bell size={15} strokeWidth={2.2} />
      </div>
      <Link href="/live-payments" className="bitryx-withdraw-alert__card" prefetch={false}>
        <p className="bitryx-withdraw-alert__linkhint">Click to view live payment stream</p>
        <p className="bitryx-withdraw-alert__title">{resolvedTitle}</p>
        <p className="bitryx-withdraw-alert__text">
          <span className="bitryx-withdraw-alert__name">{alertItem.name}</span>
          <span className="bitryx-withdraw-alert__meta"> ({alertItem.country})</span> {alertItem.action}{' '}
          <span className="bitryx-withdraw-alert__value">{alertItem.value}</span>
        </p>
      </Link>
    </div>
  )
}
