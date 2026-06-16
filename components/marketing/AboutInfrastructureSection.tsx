import type { ReactNode } from 'react'
import styles from '@/components/marketing/AboutInfrastructureSection.module.css'
import InfrastructureHighlightNote from '@/components/marketing/InfrastructureHighlightNote'

type InfraItem = {
  title: string
  description: string
  icon: ReactNode
}

const ITEMS: InfraItem[] = [
  {
    title: 'Global Mining Data Centers',
    description:
      'Redundant power, thermal management, and uptime-monitored compute clusters that map client allocations to real hashrate tiers.',
    icon: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <line x1="7" y1="8" x2="17" y2="8" />
        <line x1="7" y1="12" x2="17" y2="12" />
        <line x1="7" y1="16" x2="13" y2="16" />
      </>
    ),
  },
  {
    title: 'Trading Execution Engine',
    description:
      'A managed strategy layer that routes capital across crypto, forex, and market-linked instruments with timing and liquidity controls.',
    icon: (
      <>
        <polyline points="3 16 8 11 12 13 18 7 21 9" />
        <line x1="3" y1="21" x2="21" y2="21" />
      </>
    ),
  },
  {
    title: 'Risk and Treasury Controls',
    description:
      'Position sizing, drawdown boundaries, and treasury allocation logic designed to keep growth structured under changing market conditions.',
    icon: (
      <>
        <path d="M12 2L4 6v6c0 5 3.4 8.9 8 10 4.6-1.1 8-5 8-10V6l-8-4z" />
        <line x1="12" y1="8" x2="12" y2="14" />
        <circle cx="12" cy="17" r="1" />
      </>
    ),
  },
  {
    title: 'Real Estate Operations Layer',
    description:
      'Property investment, development oversight, and operational accounting integrated into the same reporting system as digital assets.',
    icon: (
      <>
        <path d="M3 21h18" />
        <path d="M6 21V9l6-4 6 4v12" />
        <path d="M10 21v-5h4v5" />
      </>
    ),
  },
  {
    title: 'Compliance and Audit Trail',
    description:
      'Status transitions, payout checkpoints, and operational events are recorded with clear traces to support platform transparency.',
    icon: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <line x1="8" y1="8" x2="16" y2="8" />
        <line x1="8" y1="12" x2="16" y2="12" />
        <line x1="8" y1="16" x2="13" y2="16" />
      </>
    ),
  },
  {
    title: 'Investor Intelligence Dashboard',
    description:
      'Unified visibility across mining orders, trading cycles, and real-asset performance so clients monitor outcomes from one interface.',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  },
]

export default function AboutInfrastructureSection() {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>Our Infastructures</h2>
        <p className={styles.subtitle}>
          The platform is backed by coordinated physical and system infrastructure built for mining,
          investment trading, and real-asset operations at scale.
        </p>
      </div>

      <div className={styles.grid}>
        {ITEMS.map(item => (
          <article key={item.title} className={styles.card}>
            <div className={styles.inner}>
              <div className={styles.iconWrap} aria-hidden="true">
                <svg className={styles.icon} viewBox="0 0 24 24">
                  {item.icon}
                </svg>
              </div>
              <div className={styles.copy}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <InfrastructureHighlightNote />
    </section>
  )
}
