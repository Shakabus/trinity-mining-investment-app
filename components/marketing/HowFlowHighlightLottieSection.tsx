'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import styles from '@/components/marketing/HowFlowHighlightLottieSection.module.css'

declare global {
  interface Window {
    lottie?: {
      loadAnimation: (options: {
        container: HTMLElement
        renderer: 'svg' | 'canvas' | 'html'
        loop: boolean
        autoplay: boolean
        path: string
      }) => { destroy: () => void }
    }
  }
}

const TITLE_TEXT = 'Built for Measurable Growth'
const SUBTITLE_TEXT =
  'Trinity in One is designed as a full operating system for multi-asset participation, not a single-purpose tool. Mining infrastructure, structured investment cycles, and portfolio-level visibility are connected in one platform so users can track activation, execution, and payout with clear status flow and disciplined decision points.'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function renderChar(char: string, highlighted: boolean, key: string) {
  return (
    <span
      key={key}
      className={`${styles.char} ${highlighted ? styles.charHighlighted : ''}`}
    >
      {char === ' ' ? '\u00A0' : char}
    </span>
  )
}

export default function HowFlowHighlightLottieSection() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const lottieRef = useRef<HTMLDivElement | null>(null)
  const [progress, setProgress] = useState(0)

  const titleChars = useMemo(() => Array.from(TITLE_TEXT), [])
  const subtitleChars = useMemo(() => Array.from(SUBTITLE_TEXT), [])
  const totalChars = titleChars.length + subtitleChars.length

  useEffect(() => {
    const updateProgress = () => {
      if (!sectionRef.current) return
      const rect = sectionRef.current.getBoundingClientRect()
      const start = window.innerHeight * 0.75
      const end = window.innerHeight * 0.3
      const span = rect.height + (start - end)
      const amount = start - rect.top
      setProgress(clamp(amount / span, 0, 1))
    }

    updateProgress()
    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)
    return () => {
      window.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateProgress)
    }
  }, [])

  useEffect(() => {
    let animation: { destroy: () => void } | null = null
    let scriptEl: HTMLScriptElement | null = null
    let cancelled = false

    const candidatePaths = ['/lottie/Revenue.json', '/lottie/revenue.json']

    const resolvePath = async () => {
      for (const candidate of candidatePaths) {
        try {
          const res = await fetch(candidate, { method: 'HEAD' })
          if (res.ok) return candidate
        } catch {
          // try next
        }
      }
      return candidatePaths[0]
    }

    const start = async () => {
      if (!lottieRef.current || !window.lottie || cancelled) return
      const path = await resolvePath()
      if (!lottieRef.current || !window.lottie || cancelled) return

      animation = window.lottie.loadAnimation({
        container: lottieRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path,
      })
    }

    if (window.lottie) {
      void start()
    } else {
      scriptEl = document.createElement('script')
      scriptEl.src = 'https://unpkg.com/lottie-web/build/player/lottie.min.js'
      scriptEl.async = true
      scriptEl.onload = () => void start()
      scriptEl.onerror = () => {
        const fallback = document.createElement('script')
        fallback.src = 'https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie.min.js'
        fallback.async = true
        fallback.onload = () => void start()
        document.body.appendChild(fallback)
        scriptEl = fallback
      }
      document.body.appendChild(scriptEl)
    }

    return () => {
      cancelled = true
      animation?.destroy()
      if (scriptEl) scriptEl.remove()
    }
  }, [])

  const highlightedCount = Math.floor(progress * totalChars)
  const titleHighlightCount = Math.min(highlightedCount, titleChars.length)
  const subtitleHighlightCount = Math.max(0, highlightedCount - titleChars.length)

  return (
    <section ref={sectionRef} className={styles.section}>
      <div className={styles.row}>
        <div className={styles.left}>
          <h2 className={styles.title}>
            {titleChars.map((char, index) =>
              renderChar(char, index < titleHighlightCount, `title-${index}`),
            )}
          </h2>

          <p className={styles.subtitle}>
            {subtitleChars.map((char, index) =>
              renderChar(
                char,
                index < subtitleHighlightCount,
                `subtitle-${index}`,
              ),
            )}
          </p>

          <div className={styles.ctaWrap}>
            <Link href="/sign-up" className="glass-button">
              Get Started
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>

        <div className={styles.right}>
          <div ref={lottieRef} className={styles.lottieBox} aria-hidden="true" />
        </div>
      </div>
    </section>
  )
}

