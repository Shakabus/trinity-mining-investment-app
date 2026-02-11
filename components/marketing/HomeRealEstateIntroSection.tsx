'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { Building2, Hotel, Landmark, TrendingUp } from 'lucide-react'
import styles from '@/components/marketing/HomeRealEstateIntroSection.module.css'

const OFFER_CARDS = [
  {
    title: 'Hotels and Resorts',
    text: 'Buy into premium hospitality assets with performance linked to occupancy, average rates, and operating discipline.',
    stat: 'Tiered monthly income flow',
    icon: Hotel,
  },
  {
    title: 'Condos and Residences',
    text: 'Access residential inventory in structured allocation units, with each tier mapped to a clear participation band.',
    stat: 'Flexible buy-in options',
    icon: Building2,
  },
  {
    title: 'Mixed-Use and Complexes',
    text: 'Diversify across business, retail, and living assets through one managed structure focused on long-cycle value creation.',
    stat: 'Portfolio-level diversification',
    icon: Landmark,
  },
]

export default function HomeRealEstateIntroSection() {
  const sectionRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const host = sectionRef.current
    if (!host) return

    const nodes = Array.from(host.querySelectorAll<HTMLElement>('[data-reveal]'))
    if (!nodes.length) return

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.isVisible)
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px -10% 0px' },
    )

    nodes.forEach(node => observer.observe(node))
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className={styles.section} aria-labelledby="real-estate-intro-title">
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.shell}>
        <div className={`${styles.content} ${styles.reveal}`} data-reveal>
          <p className={styles.kicker}>Real Estate Portfolio</p>
          <h2 id="real-estate-intro-title" className={styles.title}>
            Institutional property access built into the Trinity investment system.
          </h2>
          <p className={styles.text}>
            Trinity in One lets users participate in curated real estate opportunities through managed buy-in tiers.
            Each property is mapped to structured durations, projected payout bands, and transparent cycle reporting
            so investors can monitor progress from activation through payout windows in one dashboard.
          </p>

          <div className={styles.points}>
            <div className={styles.point}>
              <TrendingUp size={16} />
              <span>Performance-led allocation and monthly reporting visibility</span>
            </div>
            <div className={styles.point}>
              <TrendingUp size={16} />
              <span>Multiple property participation with approval-gated scaling</span>
            </div>
            <div className={styles.point}>
              <TrendingUp size={16} />
              <span>Integrated flow across buy-in, earnings tracking, and withdrawals</span>
            </div>
          </div>

          <div className={styles.actions}>
            <Link href="/real-estate-portfolio" className={`glass-button ${styles.cta}`}>
              Explore Real Estate Portfolio
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>

        <div className={styles.grid}>
          {OFFER_CARDS.map((card, index) => {
            const Icon = card.icon
            return (
              <article
                key={card.title}
                className={`${styles.card} ${styles.reveal}`}
                data-reveal
                style={{ transitionDelay: `${index * 90}ms` }}
              >
                <div className={styles.cardIcon}>
                  <Icon size={20} />
                </div>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
                <span>{card.stat}</span>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
