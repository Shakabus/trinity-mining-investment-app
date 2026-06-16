import type { ReactNode } from 'react'
import styles from '@/components/marketing/MiningInvestmentFramework.module.css'

type FrameworkCard = {
  title: string
  description: string
  stat: string
  icon: ReactNode
}

const CARDS: FrameworkCard[] = [
  {
    title: 'Smart Hash Power Distribution',
    description:
      'Trinity in One allocates mining power from live infrastructure pools using performance data so purchased hashrate remains productive across active cycles.',
    stat: 'Intelligent Hash Rate Allocation',
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v6m0 6v6" />
        <path d="M23 12h-6m-6 0H1" />
        <circle cx="12" cy="5" r="1" fill="#ffffff" />
        <circle cx="12" cy="19" r="1" fill="#ffffff" />
        <circle cx="5" cy="12" r="1" fill="#ffffff" />
        <circle cx="19" cy="12" r="1" fill="#ffffff" />
      </>
    ),
  },
  {
    title: 'Measurable Mining Output',
    description:
      'Effective hashrate, uptime, and allocation efficiency are tracked continuously so mining performance is monitored with operational accountability.',
    stat: 'Performance Measured, Not Assumed',
    icon: (
      <>
        <path d="M3 3v18h18" />
        <path d="M7 16l4-4 4 4 6-6" />
        <circle cx="7" cy="16" r="1.5" fill="#ffffff" />
        <circle cx="11" cy="12" r="1.5" fill="#ffffff" />
        <circle cx="15" cy="16" r="1.5" fill="#ffffff" />
        <circle cx="21" cy="10" r="1.5" fill="#ffffff" />
      </>
    ),
  },
  {
    title: 'Built to Scale With the Network',
    description:
      'The mining stack is engineered to adapt with difficulty changes, block timing shifts, and broader network competition as global conditions evolve.',
    stat: 'Infrastructure Designed for Scale',
    icon: (
      <>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </>
    ),
  },
  {
    title: 'Tuned for Network Conditions',
    description:
      'Mining operations are optimized with awareness of pool behavior, difficulty adjustments, and congestion to maintain sustainable cycle performance.',
    stat: 'Network-Aware Optimization',
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
        <path d="M16.24 7.76l-2.12 2.12" />
        <circle cx="12" cy="12" r="2" fill="#ffffff" />
      </>
    ),
  },
  {
    title: 'Strategy Execution Engine',
    description:
      'Investment plans run through a managed execution layer that applies timing, exposure controls, and cycle discipline across selected market opportunities.',
    stat: 'Rules-Based Trade Execution',
    icon: (
      <>
        <polyline points="3 16 8 11 12 13 18 7 21 9" />
        <line x1="3" y1="21" x2="21" y2="21" />
        <path d="M18 7h3v3" />
      </>
    ),
  },
  {
    title: 'Risk Layer & Capital Controls',
    description:
      'Portfolio risk is controlled with sizing boundaries, drawdown awareness, and cycle-level allocation logic to reduce concentration and preserve flexibility.',
    stat: 'Capital Protection Framework',
    icon: (
      <>
        <path d="M12 2L4 6v6c0 5 3.4 8.9 8 10 4.6-1.1 8-5 8-10V6l-8-4z" />
        <line x1="12" y1="8" x2="12" y2="14" />
        <circle cx="12" cy="17" r="1" />
      </>
    ),
  },
  {
    title: 'Multi-Asset Allocation Routing',
    description:
      'The system supports coordinated exposure across mining-linked crypto activity, structured investment execution, and real-asset strategy participation.',
    stat: 'Crypto, Markets, and Real Assets',
    icon: (
      <>
        <circle cx="6" cy="8" r="3" />
        <circle cx="18" cy="8" r="3" />
        <circle cx="12" cy="17" r="3" />
        <path d="M8.6 10.3l2.8 4.2m4.4-4.2l-2.8 4.2m-4.8-3.6h8" />
      </>
    ),
  },
  {
    title: 'Treasury & Payout Operations',
    description:
      'Cycle completion, payout readiness, and reinvestment visibility are maintained through auditable status flow so users can plan growth and withdrawals with clarity.',
    stat: 'Transparent Lifecycle Reporting',
    icon: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <line x1="7" y1="8" x2="17" y2="8" />
        <line x1="7" y1="12" x2="15" y2="12" />
        <line x1="7" y1="16" x2="13" y2="16" />
        <path d="M17 15l2 2 3-3" />
      </>
    ),
  },
]

export default function MiningInvestmentFramework() {
  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <h2>Our Investment &amp; Mining Infrastructure Framework Is Built for Performance and Profitability</h2>
      </header>

      <div className={styles.grid}>
        {CARDS.map((card, index) => (
          <article key={card.title} className={styles.card} style={{ animationDelay: `${index * 0.22}s` }}>
            <div className={styles.iconWrap} aria-hidden="true">
              <svg viewBox="0 0 24 24" className={styles.icon}>
                {card.icon}
              </svg>
            </div>
            <h3 className={styles.cardTitle}>{card.title}</h3>
            <p className={styles.cardDescription}>{card.description}</p>
            <p className={styles.cardStat}>{card.stat}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

