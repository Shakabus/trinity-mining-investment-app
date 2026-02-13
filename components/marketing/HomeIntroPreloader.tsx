'use client'

import { useEffect, useMemo, useState } from 'react'
import styles from '@/components/marketing/HomeIntroPreloader.module.css'

const MESSAGE = 'TRINITY IN ONE'
const TYPE_INTERVAL_MS = 135
const HOLD_AFTER_DONE_MS = 700
const FADE_OUT_MS = 760

export default function HomeIntroPreloader() {
  const [typedText, setTypedText] = useState('')
  const [isExiting, setIsExiting] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  const showCursor = useMemo(() => typedText.length < MESSAGE.length, [typedText.length])
  const progressLabel = useMemo(() => {
    const ratio = MESSAGE.length === 0 ? 1 : typedText.length / MESSAGE.length
    const value = Math.max(0, Math.min(100, Math.round(ratio * 100)))
    return `${value}%`
  }, [typedText.length])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const timer = window.setInterval(() => {
      setTypedText(previous => {
        if (previous.length >= MESSAGE.length) {
          window.clearInterval(timer)
          window.setTimeout(() => {
            setIsExiting(true)
            window.setTimeout(() => {
              setIsVisible(false)
              document.body.style.overflow = previousOverflow
            }, FADE_OUT_MS)
          }, HOLD_AFTER_DONE_MS)
          return previous
        }
        return MESSAGE.slice(0, previous.length + 1)
      })
    }, TYPE_INTERVAL_MS)

    return () => {
      window.clearInterval(timer)
      document.body.style.overflow = previousOverflow
    }
  }, [])

  if (!isVisible) return null

  return (
    <div className={`${styles.overlay} ${isExiting ? styles.overlayExit : ''}`} aria-hidden="true">
      <div className={styles.textWrap}>
        <span className={styles.text}>{typedText}</span>
        {showCursor ? <span className={styles.cursor}>|</span> : null}
      </div>
      <span className={styles.counter}>{progressLabel}</span>
    </div>
  )
}
