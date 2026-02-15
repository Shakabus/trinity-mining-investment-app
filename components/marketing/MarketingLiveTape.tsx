'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { generateMarketingLiveFeed, type MarketingLiveFeedItem } from '@/components/marketing/marketingLiveFeed'

const TAPE_VISIBLE_OFFSET_PX = 32
const BASE_FEED_COUNT = 1000

export default function MarketingLiveTape() {
  const [isVisible, setIsVisible] = useState(true)
  const [liveItems, setLiveItems] = useState<MarketingLiveFeedItem[]>([])
  const lastYRef = useRef(0)
  const fetchTimerRef = useRef<number | null>(null)

  const baseItems = useMemo(() => generateMarketingLiveFeed(BASE_FEED_COUNT), [])

  const tapeItems = useMemo(() => {
    const merged = liveItems.length ? liveItems : baseItems
    return [...merged, ...merged]
  }, [liveItems, baseItems])

  useEffect(() => {
    lastYRef.current = window.scrollY

    const onScroll = () => {
      const currentY = window.scrollY
      const previousY = lastYRef.current

      if (currentY < 16) {
        setIsVisible(true)
      } else if (currentY > previousY + 4) {
        setIsVisible(false)
      } else if (currentY < previousY - 4) {
        setIsVisible(true)
      }

      lastYRef.current = currentY
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--marketing-tape-offset', isVisible ? `${TAPE_VISIBLE_OFFSET_PX}px` : '0px')
  }, [isVisible])

  useEffect(
    () => () => {
      document.documentElement.style.removeProperty('--marketing-tape-offset')
    },
    [],
  )

  useEffect(() => {
    let cancelled = false

    const pullLiveApprovals = async () => {
      try {
        const response = await fetch('/api/public/live-activity?limit=60', { cache: 'no-store' })
        if (!response.ok) return
        const data = (await response.json()) as { items?: MarketingLiveFeedItem[] }
        if (cancelled) return
        setLiveItems(Array.isArray(data.items) ? data.items : [])
      } catch {
        if (!cancelled) {
          setLiveItems([])
        }
      }
    }

    pullLiveApprovals()
    fetchTimerRef.current = window.setInterval(pullLiveApprovals, 2000)

    return () => {
      cancelled = true
      if (fetchTimerRef.current) {
        window.clearInterval(fetchTimerRef.current)
      }
    }
  }, [])

  return (
    <div className={`bitryx-live-tape ${isVisible ? 'is-visible' : 'is-hidden'}`} aria-hidden="true">
      <div className="bitryx-live-tape__viewport">
        <div className="bitryx-live-tape__track">
          {tapeItems.map((item, index) => (
            <Link
              key={`${item.id}-${index}`}
              href="/live-payments"
              className="bitryx-live-tape__item"
              prefetch={false}
            >
              <span className="bitryx-live-tape__name">{item.name}</span>
              <span className="bitryx-live-tape__country">{item.country}</span>
              <span className="bitryx-live-tape__verb">{item.action}</span>
              <span
                className={
                  item.tone === 'deposit'
                    ? 'bitryx-live-tape__value is-deposit'
                    : item.tone === 'withdrawal'
                    ? 'bitryx-live-tape__value is-withdrawal'
                    : 'bitryx-live-tape__value is-plan'
                }
              >
                {item.value}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
