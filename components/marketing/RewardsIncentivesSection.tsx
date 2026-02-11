'use client'

import { useEffect, useRef, useState } from 'react'
import styles from '@/components/marketing/RewardsIncentivesSection.module.css'

type RewardKey = 'mining' | 'loyalty' | 'referral'

type RewardItem = {
  key: RewardKey
  title: string
  subtitle: string
  description: string
  lottieUrl: string
}

const REWARD_ITEMS: RewardItem[] = [
  {
    key: 'mining',
    title: 'Mining Payouts',
    subtitle: 'Rewards based on real network output',
    description:
      'Trinity in One distributes mining rewards from active hash allocations and live network conditions. Payout values reflect hashrate, difficulty movement, and uptime instead of fixed promises.',
    lottieUrl: 'https://lottie.host/84206bae-69a7-46fb-9d0e-364385cecea9/sOei6HhFFJ.lottie',
  },
  {
    key: 'loyalty',
    title: 'Loyalty Benefits',
    subtitle: 'Added value for consistent participation',
    description:
      'Accounts that stay active across cycles may unlock reduced operational friction, earlier access to plan windows, and periodic loyalty incentives tied to platform activity and compliance.',
    lottieUrl: 'https://lottie.host/7a282bbb-33e7-4e2f-9b6c-e6e300db401d/anmxJQX1Ae.lottie',
  },
  {
    key: 'referral',
    title: 'Referral Rewards',
    subtitle: 'Earn by introducing quality users',
    description:
      'Referral rewards are triggered when invited users activate qualifying plans. Credits are capped, auditable, and designed to complement real mining and trading activity inside the dashboard.',
    lottieUrl: 'https://lottie.host/11dad5d5-fa1d-431a-9254-f6e712c6d4dc/bF2Hcu7i3h.lottie',
  },
]

function DotLottiePlayer({ src, ready }: { src: string; ready: boolean }) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!ready || !containerRef.current) return

    const host = containerRef.current
    host.replaceChildren()
    const player = document.createElement('dotlottie-wc')
    player.setAttribute('src', src)
    player.setAttribute('autoplay', '')
    player.setAttribute('loop', '')
    player.style.width = '100%'
    player.style.height = '100%'
    host.appendChild(player)

    return () => {
      host.replaceChildren()
    }
  }, [ready, src])

  return <div ref={containerRef} className={styles.player} aria-hidden="true" />
}

export default function RewardsIncentivesSection() {
  const [activeKey, setActiveKey] = useState<RewardKey>('mining')
  const [isPlayerReady, setIsPlayerReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    const markReady = () => {
      if (cancelled) return
      if (window.customElements?.get('dotlottie-wc')) {
        setIsPlayerReady(true)
        return
      }

      window.customElements
        ?.whenDefined('dotlottie-wc')
        .then(() => {
          if (!cancelled) setIsPlayerReady(true)
        })
        .catch(() => {})
    }

    const loadFallback = () => {
      if (document.querySelector('script[data-dotlottie-wc-fallback]')) return
      const fallback = document.createElement('script')
      fallback.type = 'module'
      fallback.src = 'https://unpkg.com/@lottiefiles/dotlottie-wc@0.8.14/dist/dotlottie-wc.js'
      fallback.setAttribute('data-dotlottie-wc-fallback', 'true')
      fallback.onload = markReady
      document.head.appendChild(fallback)
    }

    if (window.customElements?.get('dotlottie-wc')) {
      setIsPlayerReady(true)
      return () => {
        cancelled = true
      }
    }

    const existing = document.querySelector('script[data-dotlottie-wc]')
    if (existing) {
      markReady()
      const timer = window.setTimeout(() => {
        if (!window.customElements?.get('dotlottie-wc')) {
          loadFallback()
        }
      }, 2000)
      return () => {
        cancelled = true
        window.clearTimeout(timer)
      }
    }

    const primary = document.createElement('script')
    primary.type = 'module'
    primary.src = 'https://cdn.jsdelivr.net/npm/@lottiefiles/dotlottie-wc@0.8.14/dist/dotlottie-wc.js'
    primary.setAttribute('data-dotlottie-wc', 'true')
    primary.onload = markReady
    primary.onerror = loadFallback
    document.head.appendChild(primary)

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section id="incentives" className={styles.section}>
      <div className={styles.headingWrap}>
        <h2 className={styles.title}>Rewards and Incentives</h2>
        <p className={styles.subtitle}>
          Our rewards are structured and aligned with real network activity
        </p>
      </div>

      <div className={styles.rewardsContainer}>
        <div className={styles.textContainer}>
          {REWARD_ITEMS.map(item => {
            const isActive = activeKey === item.key
            return (
              <article
                key={item.key}
                className={`${styles.rewardBlock} ${isActive ? styles.inView : ''}`}
                onMouseEnter={() => setActiveKey(item.key)}
                onFocus={() => setActiveKey(item.key)}
                onClick={() => setActiveKey(item.key)}
              >
                <h3 className={styles.rewardTitle}>{item.title}</h3>
                <p className={styles.rewardSubtitle}>{item.subtitle}</p>
                <p className={styles.rewardDescription}>{item.description}</p>

                <div className={`${styles.mobileLottie} ${isActive ? styles.show : ''}`}>
                  <DotLottiePlayer src={item.lottieUrl} ready={isPlayerReady} />
                </div>
              </article>
            )
          })}
        </div>

        <div className={styles.lottieContainer}>
          {REWARD_ITEMS.map(item => (
            <div
              key={item.key}
              className={`${styles.lottieAnimation} ${
                activeKey === item.key ? styles.active : ''
              }`}
            >
              <DotLottiePlayer src={item.lottieUrl} ready={isPlayerReady} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
