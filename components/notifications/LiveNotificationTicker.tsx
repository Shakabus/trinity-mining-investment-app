'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import styles from './LiveNotificationTicker.module.css'
import type { NotificationTickerItem, NotificationTickerTone } from '@/lib/notification-ticker'

interface LiveNotificationTickerProps {
  endpoint: string
  label?: string
  emptyText?: string
  pollIntervalMs?: number
  tickerDurationSec?: number
}

const SOUND_STORAGE_KEY = 'live_notification_sound_enabled'
const SOUND_UNLOCKED_KEY = 'live_notification_sound_unlocked'

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
  tickerDurationSec = 74,
}: LiveNotificationTickerProps) {
  const [items, setItems] = useState<NotificationTickerItem[]>([])
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.localStorage.getItem(SOUND_STORAGE_KEY) !== 'false'
  })
  const [soundUnlocked, setSoundUnlocked] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(SOUND_UNLOCKED_KEY) === 'true'
  })
  const lastTopItemIdRef = useRef<string | null>(null)
  const initialLoadRef = useRef(true)
  const audioContextRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || soundUnlocked) return

    const unlockAudio = async () => {
      try {
        const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!AudioContextClass) return
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContextClass()
        }
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume()
        }
      } catch {
        return
      }

      setSoundUnlocked(true)
      window.localStorage.setItem(SOUND_UNLOCKED_KEY, 'true')
      window.removeEventListener('pointerdown', unlockAudio)
      window.removeEventListener('keydown', unlockAudio)
    }

    window.addEventListener('pointerdown', unlockAudio)
    window.addEventListener('keydown', unlockAudio)

    return () => {
      window.removeEventListener('pointerdown', unlockAudio)
      window.removeEventListener('keydown', unlockAudio)
    }
  }, [soundUnlocked])

  const playTone = useCallback(async () => {
    if (typeof window === 'undefined' || !soundEnabled || !soundUnlocked) return
    const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return

    try {
      const context = audioContextRef.current ?? new AudioContextClass()
      audioContextRef.current = context
      if (context.state === 'suspended') {
        await context.resume()
      }

      const oscillator = context.createOscillator()
      const gainNode = context.createGain()
      oscillator.type = 'triangle'
      oscillator.frequency.setValueAtTime(920, context.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(560, context.currentTime + 0.2)
      gainNode.gain.setValueAtTime(0.0001, context.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.06, context.currentTime + 0.03)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.24)
      oscillator.connect(gainNode)
      gainNode.connect(context.destination)
      oscillator.start(context.currentTime)
      oscillator.stop(context.currentTime + 0.25)
    } catch {
      // Ignore audio failures; ticker should continue without sound.
    }
  }, [soundEnabled, soundUnlocked])

  useEffect(() => {
    let isMounted = true

    const fetchItems = async () => {
      try {
        const response = await fetch(`${endpoint}?limit=42`, { cache: 'no-store' })
        if (!response.ok) return

        const payload = (await response.json()) as { items?: NotificationTickerItem[] }
        if (!isMounted || !Array.isArray(payload.items)) return
        const nextItems = payload.items
        const nextTopItemId = nextItems[0]?.id ?? null

        if (initialLoadRef.current) {
          initialLoadRef.current = false
          lastTopItemIdRef.current = nextTopItemId
          setItems(nextItems)
          return
        }

        if (nextTopItemId && lastTopItemIdRef.current && nextTopItemId !== lastTopItemIdRef.current) {
          void playTone()
        }

        lastTopItemIdRef.current = nextTopItemId
        setItems(nextItems)
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
  }, [endpoint, pollIntervalMs, playTone])

  const renderedItems = useMemo(() => {
    if (items.length === 0) return []
    return [...items, ...items]
  }, [items])

  const toggleSound = () => {
    const next = !soundEnabled
    setSoundEnabled(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SOUND_STORAGE_KEY, String(next))
    }
  }

  return (
    <div
      className={styles.wrapper}
      role="status"
      aria-live="polite"
      style={{ ['--ticker-duration' as string]: `${tickerDurationSec}s` }}
    >
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
      <button
        type="button"
        onClick={toggleSound}
        className={styles.soundToggle}
        aria-label={soundEnabled ? 'Mute notification sound' : 'Enable notification sound'}
        title={soundEnabled ? 'Sound on' : 'Sound off'}
      >
        {soundEnabled ? '🔔' : '🔕'}
      </button>
    </div>
  )
}
