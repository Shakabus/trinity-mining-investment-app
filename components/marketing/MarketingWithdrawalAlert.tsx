'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { generateWithdrawalFeed, type MarketingLiveFeedItem } from '@/components/marketing/marketingLiveFeed'

const BASE_FEED_COUNT = 1000
const INITIAL_MIN_DELAY_MS = 12000
const INITIAL_MAX_DELAY_MS = 26000
const MIN_INTERVAL_MS = 2 * 60 * 1000
const MAX_INTERVAL_MS = 5 * 60 * 1000
const BELL_PHASE_MS = 900
const EXIT_PHASE_MS = 550

type AlertPhase = 'hidden' | 'bell' | 'open' | 'closing'

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

export default function MarketingWithdrawalAlert() {
  const [phase, setPhase] = useState<AlertPhase>('hidden')
  const [alertItem, setAlertItem] = useState<MarketingLiveFeedItem | null>(null)
  const timersRef = useRef<number[]>([])
  const queueRef = useRef<MarketingLiveFeedItem[]>([])
  const queueIndexRef = useRef(0)

  const withdrawalItems = useMemo(() => generateWithdrawalFeed(BASE_FEED_COUNT), [])

  useEffect(() => {
    queueRef.current = shuffle(withdrawalItems)
    queueIndexRef.current = 0
  }, [withdrawalItems])

  useEffect(() => {
    const clearTimers = () => {
      for (const timer of timersRef.current) {
        window.clearTimeout(timer)
      }
      timersRef.current = []
    }

    const nextItem = () => {
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
          scheduleNext(randomBetween(MIN_INTERVAL_MS, MAX_INTERVAL_MS))
        }, BELL_PHASE_MS + visibleDuration + EXIT_PHASE_MS)

        timersRef.current.push(openTimer, closeTimer, resetTimer)
      }, delay)

      timersRef.current.push(timer)
    }

    scheduleNext(randomBetween(INITIAL_MIN_DELAY_MS, INITIAL_MAX_DELAY_MS))
    return clearTimers
  }, [])

  if (!alertItem) return null

  const isVisible = phase !== 'hidden'
  const isExpanded = phase === 'open' || phase === 'closing'
  const isClosing = phase === 'closing'

  return (
    <div
      className={`bitryx-withdraw-alert ${isVisible ? 'is-visible' : ''} ${isExpanded ? 'is-expanded' : ''} ${
        isClosing ? 'is-closing' : ''
      }`}
      aria-hidden="true"
    >
      <div className={`bitryx-withdraw-alert__bell ${phase === 'bell' ? 'is-ringing' : ''}`}>🔔</div>
      <div className="bitryx-withdraw-alert__card">
        <p className="bitryx-withdraw-alert__title">Live payout</p>
        <p className="bitryx-withdraw-alert__text">
          <span className="bitryx-withdraw-alert__name">{alertItem.name}</span>
          <span className="bitryx-withdraw-alert__meta"> ({alertItem.country})</span> {alertItem.action}{' '}
          <span className="bitryx-withdraw-alert__value">{alertItem.value}</span>
        </p>
      </div>
    </div>
  )
}
