'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import styles from '@/components/marketing/AboutWhatWeDoSection.module.css'

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

export default function AboutWhatWeDoSection() {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let animation: { destroy: () => void } | null = null
    let scriptEl: HTMLScriptElement | null = null
    let cancelled = false
    const candidatePaths = [
      '/lottie/Cryptocurrency.json',
      '/lottie/cryptocurrency.json',
      '/lottie/CryptoCurrency.json',
    ]

    const resolvePath = async () => {
      for (const candidate of candidatePaths) {
        try {
          const response = await fetch(candidate, { method: 'HEAD' })
          if (response.ok) return candidate
        } catch {
          // Try next candidate.
        }
      }
      return candidatePaths[0]
    }

    const start = async () => {
      if (!containerRef.current || !window.lottie || cancelled) return
      const path = await resolvePath()
      if (!containerRef.current || !window.lottie || cancelled) return

      animation = window.lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'canvas',
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
      scriptEl.onload = () => {
        void start()
      }
      scriptEl.onerror = () => {
        const fallbackScript = document.createElement('script')
        fallbackScript.src = 'https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie.min.js'
        fallbackScript.async = true
        fallbackScript.onload = () => {
          void start()
        }
        document.body.appendChild(fallbackScript)
        scriptEl = fallbackScript
      }
      document.body.appendChild(scriptEl)
    }

    return () => {
      cancelled = true
      animation?.destroy()
      if (scriptEl) {
        scriptEl.remove()
      }
    }
  }, [])

  return (
    <section className={styles.section}>
      <div className={styles.row}>
        <div className={styles.lottieWrap}>
          <div ref={containerRef} className={styles.lottieBox} aria-hidden="true" />
        </div>

        <div className={styles.content}>
          <h2 className={styles.title}>What we do</h2>
          <p className={styles.text}>
            Trinity in One runs a unified multi-asset operation where cloud mining infrastructure,
            structured investment trading, and real-asset strategy work together under one execution
            framework. Clients access transparent plan flows, monitored performance windows, and a
            single reporting path from activation to payout.
          </p>
          <p className={styles.text}>
            We handle the operational complexity, including infrastructure uptime, strategy execution,
            and portfolio controls, so users can focus on disciplined participation and measurable
            growth through one integrated platform.
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
      </div>
    </section>
  )
}
