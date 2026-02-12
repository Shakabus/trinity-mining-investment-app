'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import styles from '@/components/marketing/MiningPlansSection.module.css'

type PlanSection = {
  title: string
  items: string[]
}

type Plan = {
  id: string
  title: string
  subtitle: string
  price: string
  features: string[]
  modalSubtitle: string
  sections: PlanSection[]
}

const GLOBAL_PARAMETERS: string[] = [
  'Primary Network: Bitcoin (BTC)',
  'Mining Algorithm: SHA-256',
  'Consensus Model: Proof of Work (PoW)',
  'Reward Model: Block reward + transaction fees (network adjusted)',
  'Average Block Time Target: ~10 minutes',
  'Pool Strategy: PPS+ with uptime-aware routing',
  'Per-User Allocation Controls: Applied by plan tier',
  'Operational Uptime Target: 99.9%',
]

const PLANS: Plan[] = [
  {
    id: 'starter',
    title: 'Starter Plan',
    subtitle: 'Low-risk entry and system familiarization',
    price: '$50',
    features: [
      '2 PH/s (2,000 TH/s) Hash Rate',
      'SHA-256 Allocation',
      '30 / 60 / 90 day duration',
      'Real-time monitoring',
      'Daily automated payouts',
    ],
    modalSubtitle:
      'Designed for users entering the system with controlled exposure and transparent cycle tracking.',
    sections: [
      {
        title: 'Technical Allocation',
        items: [
          'Hash Rate: 2 PH/s (2,000 TH/s)',
          'Hardware Tier: Shared fractional Antminer S19-class allocation',
          'Efficiency Profile: Optimized for stable baseline output',
          'Cooling Layer: Industrial airflow controls',
          'Uptime Target: 99.5%',
        ],
      },
      {
        title: 'Contract Terms',
        items: [
          'Duration: 30 / 60 / 90 days',
          'Entry Cost: $50',
          'Maintenance + power charges applied transparently',
          'Optional renewal at cycle completion',
        ],
      },
      {
        title: 'Operational Fit',
        items: [
          'Best for first-cycle participation',
          'Clear dashboard visibility for hash, cycle, and payout flow',
          'Structured to build familiarity before scaling plan size',
        ],
      },
    ],
  },
  {
    id: 'growth',
    title: 'Growth Plan',
    subtitle: 'Balanced efficiency and moderate scale',
    price: '$120',
    features: [
      '6 PH/s (6,000 TH/s) Hash Rate',
      'Antminer S19 Pro-class routing',
      '90 / 180 day duration',
      'Priority pool routing',
      'Enhanced reporting metrics',
    ],
    modalSubtitle:
      'Built for users moving beyond starter cycles into stronger hashrate exposure with better route efficiency.',
    sections: [
      {
        title: 'Technical Allocation',
        items: [
          'Hash Rate: 6 PH/s (6,000 TH/s)',
          'Hardware Tier: S19 Pro-class allocation pool',
          'Power Profile: Improved efficiency versus Starter tier',
          'Uptime Target: 99.7%',
        ],
      },
      {
        title: 'Contract Terms',
        items: [
          'Duration: 90 / 180 days',
          'Entry Cost: $120',
          'Transparent daily operational costing',
          'Upgrade path to higher tiers at renewal',
        ],
      },
      {
        title: 'Operational Fit',
        items: [
          'Balanced risk and scale',
          'Useful for users tracking consistency across longer windows',
          'Supports disciplined progression into mid-tier mining',
        ],
      },
    ],
  },
  {
    id: 'standard',
    title: 'Standard Plan',
    subtitle: 'Long-term consistency and optimized fees',
    price: '$200',
    features: [
      '10 PH/s (10,000 TH/s) Hash Rate',
      'Antminer S19 XP-class efficiency',
      '180 / 365 day duration',
      '+10% renewal bonus',
      'Advanced performance dashboards',
    ],
    modalSubtitle:
      'Structured for users prioritizing lower operational friction and more consistent long-cycle performance.',
    sections: [
      {
        title: 'Technical Allocation',
        items: [
          'Hash Rate: 10 PH/s (10,000 TH/s)',
          'Hardware Tier: S19 XP-class routing',
          'Efficiency Layer: Lower energy-per-TH profile',
          'Uptime Target: 99.8%',
        ],
      },
      {
        title: 'Contract Terms',
        items: [
          'Duration: 180 / 365 days',
          'Entry Cost: $200',
          'Fee structure optimized for medium to long duration',
          'Renewal bonus: +10% hashrate uplift at extension',
        ],
      },
      {
        title: 'Operational Fit',
        items: [
          'Designed for long-horizon users',
          'Cycle data supports reinvestment planning',
          'Strong baseline before entering high-cap tiers',
        ],
      },
    ],
  },
  {
    id: 'pro',
    title: 'Pro Plan',
    subtitle: 'Serious miners optimizing long-term output',
    price: '$800',
    features: [
      '40 PH/s (40,000 TH/s) Hash Rate',
      'S21 / S19 XP Hydro-class access',
      '1 / 2 / 3 year duration',
      'Intelligent pool optimization',
      'Priority payout processing',
    ],
    modalSubtitle:
      'Engineered for high-cap users who need stronger allocation control, deeper reporting, and longer-cycle execution.',
    sections: [
      {
        title: 'Technical Allocation',
        items: [
          'Hash Rate: 40 PH/s (40,000 TH/s)',
          'Hardware Tier: S21 and hydro-capable clusters',
          'Cooling: Advanced hydro and controlled thermal systems',
          'Uptime Target: 99.9%',
        ],
      },
      {
        title: 'Contract Terms',
        items: [
          'Duration: 1 / 2 / 3 years',
          'Entry Cost: $800',
          'Longer-term structure with lower relative operational drag',
          'Priority processing on payout windows',
        ],
      },
      {
        title: 'Operational Fit',
        items: [
          'For users scaling beyond mid-tier exposure',
          'Supports steady cycle execution through market changes',
          'Stronger fit for portfolio-level planning',
        ],
      },
    ],
  },
  {
    id: 'vip',
    title: 'VIP Plan',
    subtitle: 'Institutional-grade mining exposure',
    price: 'From $5,000',
    features: [
      '200 PH/s (200,000 TH/s) Hash Rate',
      'Enterprise ASIC cluster allocation',
      'Custom 2-5 year duration',
      'Dedicated account management',
      'SLA-backed uptime controls',
    ],
    modalSubtitle:
      'High-capacity plan tier for advanced operators requiring dedicated support and enterprise-level execution reliability.',
    sections: [
      {
        title: 'Technical Allocation',
        items: [
          'Hash Rate: 200 PH/s baseline',
          'Enterprise ASIC cluster routing',
          'Redundant power, network, and cooling controls',
          'Uptime Target: 99.95%',
        ],
      },
      {
        title: 'Contract Terms',
        items: [
          'Duration: custom 2-5 years',
          'Entry Cost: from $5,000',
          'Plan economics tuned for scale commitments',
          'Custom payout and reporting cadence options',
        ],
      },
      {
        title: 'Operational Fit',
        items: [
          'For high-scale and institutional-style allocations',
          'Dedicated support and review cadence',
          'Designed for continuity, control, and visibility at scale',
        ],
      },
    ],
  },
  {
    id: 'elite',
    title: 'Elite Multi-Asset Plan',
    subtitle: 'Diversified BTC, ETH & LTC mining exposure',
    price: 'From $12,000',
    features: [
      '200 PH/s BTC allocation',
      'ETH-equivalent + LTC mining routing',
      'Enterprise ASIC + GPU clusters',
      'Custom 2-5 year duration',
      'Priority payout and reporting',
    ],
    modalSubtitle:
      'Premium tier combining multi-network mining allocation with deeper portfolio-style reporting and high-touch operations support.',
    sections: [
      {
        title: 'Technical Allocation',
        items: [
          'BTC: 200 PH/s SHA-256 routing',
          'ETH-equivalent GPU allocation layer',
          'LTC: Scrypt-capable miner routing',
          'Cross-network capacity managed from one cycle dashboard',
        ],
      },
      {
        title: 'Contract Terms',
        items: [
          'Duration: custom 2-5 years',
          'Entry Cost: from $12,000',
          'Network-specific cost components disclosed in-plan',
          'Custom reporting granularity and payout controls',
        ],
      },
      {
        title: 'Operational Fit',
        items: [
          'Best for diversification across mining exposures',
          'Helps reduce single-network concentration',
          'Designed for users managing larger multi-asset strategy',
        ],
      },
    ],
  },
]

export default function MiningPlansSection() {
  const [activePlanId, setActivePlanId] = useState<string | null>(null)

  const activePlan = useMemo(
    () => PLANS.find(plan => plan.id === activePlanId) ?? null,
    [activePlanId],
  )

  useEffect(() => {
    if (!activePlanId) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [activePlanId])

  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <h2 className={styles.title}>Trinity Mining Plans</h2>
        <p className={styles.intro}>
          Trinity provides structured cloud mining plans mapped to live hashrate tiers, operational
          uptime controls, and transparent payout cycles. Each plan is designed for a defined
          participation profile, from onboarding and steady growth to high-capacity and
          multi-network allocation.
        </p>
        <h3 className={styles.parametersTitle}>Global Mining Parameters (Applies to All Plans)</h3>
        <ul className={styles.parametersList}>
          {GLOBAL_PARAMETERS.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </header>

      <div className={styles.grid}>
        {PLANS.map(plan => (
          <article
            key={plan.id}
            className={styles.card}
            role="button"
            tabIndex={0}
            onClick={() => setActivePlanId(plan.id)}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setActivePlanId(plan.id)
              }
            }}
          >
            <h4 className={styles.planTitle}>{plan.title}</h4>
            <p className={styles.planSubtitle}>{plan.subtitle}</p>
            <p className={styles.planPrice}>{plan.price}</p>
            <ul className={styles.featuresList}>
              {plan.features.map(feature => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <button
              type="button"
              className={styles.viewPlanButton}
              onClick={event => {
                event.stopPropagation()
                setActivePlanId(plan.id)
              }}
            >
              View Plan
            </button>
          </article>
        ))}
      </div>

      {activePlan && (
        <div
          className={styles.modalOverlay}
          onClick={event => {
            if (event.target === event.currentTarget) {
              setActivePlanId(null)
            }
          }}
        >
          <div className={styles.modalContent}>
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setActivePlanId(null)}
              aria-label="Close plan details"
            >
              &times;
            </button>

            <h3 className={styles.modalTitle}>{activePlan.title}</h3>
            <p className={styles.modalSubtitle}>{activePlan.modalSubtitle}</p>

            {activePlan.sections.map(section => (
              <div key={section.title} className={styles.modalSection}>
                <h4 className={styles.modalSectionTitle}>{section.title}</h4>
                <ul className={styles.modalList}>
                  {section.items.map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}

            <Link href="/sign-up" className={styles.buyButton}>
              Buy Plan
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}

