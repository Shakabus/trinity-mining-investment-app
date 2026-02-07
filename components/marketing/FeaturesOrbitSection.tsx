'use client'

import { useEffect, useMemo, useRef } from 'react'
import styles from '@/components/marketing/FeaturesOrbitSection.module.css'

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

type FeatureItem = {
  title: string
  description: string
  icon: React.ReactNode
}

const FEATURES: FeatureItem[] = [
  {
    title: 'Real-Time Earnings Dashboard',
    description:
      'Track hashrates, daily earnings, and mining stats live with a customizable dashboard built for transparent visibility and control.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="9" y1="3" x2="9" y2="21" />
        <line x1="15" y1="3" x2="15" y2="21" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
        <polyline points="12 17 12 12 15 12" />
      </svg>
    ),
  },
  {
    title: 'Managed Investment Trading Perks',
    description:
      'Access centrally managed trading strategies across crypto, stocks, and property-linked exposure with active risk control and dynamic allocation.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v18" />
        <path d="M5 12l7-7 7 7" />
        <circle cx="12" cy="12" r="3" />
        <path d="M9 16c0 1.5 1.5 3 3 3s3-1.5 3-3" />
      </svg>
    ),
  },
  {
    title: 'Multi-Asset Trading Support',
    description:
      'Operate from one account while portfolio engines rotate exposure between mining-linked assets and market opportunities for better balance.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v12M9 9l3-3 3 3M9 15l3 3 3-3" />
        <circle cx="12" cy="12" r="2" fill="#ffffff" />
      </svg>
    ),
  },
  {
    title: 'Flexible Contract Plans',
    description:
      'Choose contracts by capital level, payout window, and strategy appetite. Move between plan tiers as your portfolio objectives grow.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <line x1="7" y1="8" x2="17" y2="8" />
        <line x1="7" y1="12" x2="17" y2="12" />
        <line x1="7" y1="16" x2="13" y2="16" />
      </svg>
    ),
  },
  {
    title: 'Instant Payouts and Low Withdrawal Fees',
    description:
      'Request withdrawals from completed cycles with low fee friction and payout handling designed for faster access to realized earnings.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M16 8l-8 8M8 8h8v8" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      </svg>
    ),
  },
  {
    title: 'Referral and Bonus Programs',
    description:
      'Earn bonus rewards and commission credits by inviting others, with referral activity visible in your dashboard performance views.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
]

export default function FeaturesOrbitSection() {
  const lottieRef = useRef<HTMLDivElement | null>(null)

  const lottiePaths = useMemo(
    () => ['/lottie/crypto%20bitcoin.json', '/lottie/crypto bitcoin.json'],
    []
  )

  useEffect(() => {
    let animation: { destroy: () => void } | null = null
    let scriptEl: HTMLScriptElement | null = null
    let cancelled = false

    const resolvePath = async () => {
      for (const candidate of lottiePaths) {
        try {
          const response = await fetch(candidate, { method: 'HEAD' })
          if (response.ok) return candidate
        } catch {
          // try next path
        }
      }
      return lottiePaths[0]
    }

    const start = async () => {
      if (!lottieRef.current || !window.lottie) return
      const path = await resolvePath()
      if (cancelled || !lottieRef.current || !window.lottie) return
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
      scriptEl.onload = () => {
        void start()
      }
      document.body.appendChild(scriptEl)
    }

    return () => {
      cancelled = true
      animation?.destroy()
      scriptEl?.remove()
    }
  }, [lottiePaths])

  return (
    <section className={styles.section}>
      <div className={styles.titleWrap}>
        <h2 className={styles.title}>Our Features</h2>
        <p className={styles.subtitle}>Offering practical and rewarding features</p>
      </div>

      <div className={styles.featuresContainer}>
        <div ref={lottieRef} className={styles.bgLottie} aria-hidden="true" />
        {FEATURES.map(item => (
          <div key={item.title} className={styles.featureItem}>
            <div className={styles.featureIcon}>{item.icon}</div>
            <div className={styles.featureContent}>
              <div className={styles.featureTitle}>{item.title}</div>
              <div className={styles.featureDescription}>{item.description}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

