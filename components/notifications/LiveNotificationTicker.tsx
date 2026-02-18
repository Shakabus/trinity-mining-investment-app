'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import styles from './LiveNotificationTicker.module.css'
import type { NotificationTickerItem, NotificationTickerTone } from '@/lib/notification-ticker'

interface LiveNotificationTickerProps {
  endpoint: string
  label?: string
  emptyText?: string
  pollIntervalMs?: number
}

function toneClassName(tone: NotificationTickerTone) {
  if (tone === 'success') return styles.dotSuccess
  if (tone === 'warning') return styles.dotWarning
  if (tone === 'danger') return styles.dotDanger
  return styles.dotInfo
}

export default function LiveNotificationTicker({
  endpoint,
  label = 'Live updates',
  emptyText = 'No updates yet.',
  pollIntervalMs = 12000,
}: LiveNotificationTickerProps) {
  const [items, setItems] = useState<NotificationTickerItem[]>([])

  useEffect(() => {
    let isMounted = true

    const fetchItems = async () => {
      try {
        const response = await fetch(`${endpoint}?limit=42`, { cache: 'no-store' })
        if (!response.ok) return

        const payload = (await response.json()) as { items?: NotificationTickerItem[] }
        if (!isMounted || !Array.isArray(payload.items)) return
        setItems(payload.items)
      } catch {
        // Keep existing ticker entries on network errors.
      }
    }

    fetchItems()
    const timer = window.setInterval(fetchItems, pollIntervalMs)

    return () => {
      isMounted = false
      window.clearInterval(timer)
    }
  }, [endpoint, pollIntervalMs])

  const renderedItems = useMemo(() => {
    if (items.length === 0) return []
    return [...items, ...items]
  }, [items])

  return (
    <div className={styles.wrapper} role="status" aria-live="polite">
      <span className={styles.label}>{label}</span>
      <div className={styles.viewport}>
        {renderedItems.length === 0 ? (
          <p className={styles.empty}>{emptyText}</p>
        ) : (
          <div className={styles.track}>
            {renderedItems.map((item, index) => {
              const content = (
                <>
                  <span className={`${styles.toneDot} ${toneClassName(item.tone)}`} />
                  <span>{item.text}</span>
                  <span className={styles.divider}>•</span>
                </>
              )

              if (item.href) {
                return (
                  <Link key={`${item.id}-${index}`} href={item.href} className={styles.item}>
                    {content}
                  </Link>
                )
              }

              return (
                <span key={`${item.id}-${index}`} className={styles.item}>
                  {content}
                </span>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

