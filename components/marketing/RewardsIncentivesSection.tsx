'use client'

import { useEffect, useRef, useState } from 'react'
import styles from '@/components/marketing/RewardsIncentivesSection.module.css'

type RewardKey = 'mining' | 'loyalty' | 'referral'

type RewardItem = {
  key: RewardKey
  title: string
  subtitle: string
  description: string
  animationPath: string
}

const REWARD_ITEMS: RewardItem[] = [
  {
    key: 'mining',
    title: 'Mining Payouts',
    subtitle: 'Rewards based on real network output',
    description:
      'Trinity in One distributes mining rewards from active hash allocations and live network conditions. Payout values reflect hashrate, difficulty movement, and uptime instead of fixed promises.',
    animationPath: '/lottie/rewards/referral-rewards.json',
  },
  {
    key: 'loyalty',
    title: 'Loyalty Benefits',
    subtitle: 'Added value for consistent participation',
    description:
      'Accounts that stay active across cycles may unlock reduced operational friction, earlier access to plan windows, and periodic loyalty incentives tied to platform activity and compliance.',
    animationPath: '/lottie/rewards/loyalty-benefits.json',
  },
  {
    key: 'referral',
    title: 'Referral Rewards',
    subtitle: 'Earn by introducing quality users',
    description:
      'Referral rewards are triggered when invited users activate qualifying plans. Credits are capped, auditable, and designed to complement real mining and trading activity inside the dashboard.',
    animationPath: '/lottie/rewards/mining-payouts.json',
  },
]

function LottiePlayer({ path }: { path: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    let animation: { destroy: () => void } | null = null

    const initAnimation = () => {
      const lottieLib = (window as Window & { lottie?: any }).lottie
      if (!containerRef.current || !lottieLib || cancelled) return

      animation = lottieLib.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path,
      })
    }

    if ((window as Window & { lottie?: any }).lottie) {
      initAnimation()
    } else {
      const existingScript = document.querySelector('script[data-lottie-web-global]')
      if (!existingScript) {
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/lottie-web/build/player/lottie.min.js'
        script.async = true
        script.setAttribute('data-lottie-web-global', 'true')
        script.onload = initAnimation
        script.onerror = () => {
          const fallbackScript = document.createElement('script')
          fallbackScript.src =
            'https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie.min.js'
          fallbackScript.async = true
          fallbackScript.onload = initAnimation
          document.head.appendChild(fallbackScript)
        }
        document.head.appendChild(script)
      } else {
        existingScript.addEventListener('load', initAnimation, { once: true })
      }
    }

    return () => {
      cancelled = true
      if (animation) {
        animation.destroy()
      }
    }
  }, [path])

  return <div ref={containerRef} className={styles.player} aria-hidden="true" />
}

export default function RewardsIncentivesSection() {
  const [activeKey, setActiveKey] = useState<RewardKey>('mining')

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
                  <LottiePlayer path={item.animationPath} />
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
              <LottiePlayer path={item.animationPath} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
