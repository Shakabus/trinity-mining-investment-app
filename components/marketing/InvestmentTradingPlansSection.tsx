'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import styles from '@/components/marketing/InvestmentTradingPlansSection.module.css'

type PlanSection = {
  title: string
  items: string[]
}

type TradingPlan = {
  id: string
  title: string
  subtitle: string
  price: string
  features: string[]
  modalSubtitle: string
  sections: PlanSection[]
}

const GLOBAL_PARAMETERS: string[] = [
  'Market Coverage: Crypto, stocks, and property-linked exposure',
  'Capital Tiers: 2,000-9,999 USD / 10,000-49,999 USD / 50,000+ USD',
  'Cycle Window: 35 to 96 hours by selected plan tier',
  'Return Model: Multiplier-based payout after cycle completion',
  'Execution Layer: Managed allocation with risk-tiered routing',
  'Visibility: Real-time status flow from pending to completed in dashboard',
  'Reinvestment: Optional after each completed cycle',
  'Control Framework: Exposure balancing, sizing rules, and drawdown controls',
]

const TRADING_PLANS: TradingPlan[] = [
  {
    id: 'mega-entry',
    title: 'Mega Cloud Pack',
    subtitle: 'Entry tier for controlled onboarding',
    price: '$2,000',
    features: [
      'Return Rate: 2.12x',
      'Cycle Window: 35-48 hours',
      'Managed strategy routing',
      'Live cycle tracking',
      'Capital-first risk controls',
    ],
    modalSubtitle:
      'Built for users starting with disciplined capital while learning the execution rhythm of the trading system.',
    sections: [
      {
        title: 'Capital and Cycle Structure',
        items: [
          'Capital Band: 2,000 to 9,999 USD',
          'Configured Tier: 2,000 USD',
          'Cycle Duration: 35 to 48 hours',
          'Execution Mode: Managed multi-asset routing',
        ],
      },
      {
        title: 'Return and Control Model',
        items: [
          'Return Multiplier: 2.12x',
          'Payout Trigger: Cycle completion',
          'Control Layer: Position sizing and exposure guardrails',
          'Status Transparency: Pending, active, and completed cycle states',
        ],
      },
      {
        title: 'Best Fit',
        items: [
          'Users onboarding into investment trading flow',
          'Capital discipline with measurable cycle reporting',
          'Clean baseline before scaling into higher return tiers',
        ],
      },
    ],
  },
  {
    id: 'mega-growth',
    title: 'Mega Cloud Pack',
    subtitle: 'Upper tier within the same fast-cycle framework',
    price: '$9,500',
    features: [
      'Return Rate: 2.78x',
      'Cycle Window: 35-48 hours',
      'Higher-cap deployment in same tier',
      'Dashboard-level cycle analytics',
      'Fast reallocation at cycle close',
    ],
    modalSubtitle:
      'For users staying in the fast-cycle profile while deploying higher capital and targeting stronger multiplier outcomes.',
    sections: [
      {
        title: 'Capital and Cycle Structure',
        items: [
          'Capital Band: 2,000 to 9,999 USD',
          'Configured Tier: 9,500 USD',
          'Cycle Duration: 35 to 48 hours',
          'Execution Mode: Managed strategy engine with active balancing',
        ],
      },
      {
        title: 'Return and Control Model',
        items: [
          'Return Multiplier: 2.78x',
          'Payout Trigger: Completed cycle settlement',
          'Control Layer: Risk-capped allocation per strategy sleeve',
          'Monitoring: Live cycle metrics and status updates',
        ],
      },
      {
        title: 'Best Fit',
        items: [
          'Users scaling from entry capital within the same duration profile',
          'Operators prioritizing short-cycle continuity',
          'Step-up tier before moving into premium bands',
        ],
      },
    ],
  },
  {
    id: 'top-core',
    title: 'Top Premium Package',
    subtitle: 'Mid-cap tier for balanced duration and return',
    price: '$10,000',
    features: [
      'Return Rate: 2.25x',
      'Cycle Window: 48-72 hours',
      'Structured diversification routing',
      'Portfolio activity visibility',
      'Cycle-level performance logs',
    ],
    modalSubtitle:
      'Introduces longer cycle windows and broader execution balancing for users moving into mid-cap allocations.',
    sections: [
      {
        title: 'Capital and Cycle Structure',
        items: [
          'Capital Band: 10,000 to 49,999 USD',
          'Configured Tier: 10,000 USD',
          'Cycle Duration: 48 to 72 hours',
          'Execution Mode: Multi-asset strategy routing with monitored exposure',
        ],
      },
      {
        title: 'Return and Control Model',
        items: [
          'Return Multiplier: 2.25x',
          'Payout Trigger: Cycle completion',
          'Control Layer: Tiered exposure limits and risk buffers',
          'Reporting: Structured cycle and payout logs in dashboard',
        ],
      },
      {
        title: 'Best Fit',
        items: [
          'Users transitioning into medium-cycle planning',
          'Balanced capital deployment across strategy buckets',
          'Clear fit for staged reinvestment behavior',
        ],
      },
    ],
  },
  {
    id: 'top-advanced',
    title: 'Top Premium Package',
    subtitle: 'Advanced mid-cap deployment with higher multiplier',
    price: '$42,000',
    features: [
      'Return Rate: 2.75x',
      'Cycle Window: 48-72 hours',
      'Expanded managed allocation',
      'Enhanced payout modeling',
      'High-visibility execution flow',
    ],
    modalSubtitle:
      'Designed for larger mid-cap commitments where users need stronger cycle outcomes with controlled execution depth.',
    sections: [
      {
        title: 'Capital and Cycle Structure',
        items: [
          'Capital Band: 10,000 to 49,999 USD',
          'Configured Tier: 42,000 USD',
          'Cycle Duration: 48 to 72 hours',
          'Execution Mode: Managed portfolio engine with deeper allocation coverage',
        ],
      },
      {
        title: 'Return and Control Model',
        items: [
          'Return Multiplier: 2.75x',
          'Payout Trigger: Completed cycle settlement',
          'Control Layer: Risk-aware strategy balancing and route rotation',
          'Monitoring: Full cycle status and payout traceability',
        ],
      },
      {
        title: 'Best Fit',
        items: [
          'Users scaling toward high-cap operations',
          'Cycle-based compounding with managed discipline',
          'Bridge tier into VIP capital bands',
        ],
      },
    ],
  },
  {
    id: 'vip-strategic',
    title: 'VIP Promo Pack',
    subtitle: 'High-cap tier with extended managed cycle windows',
    price: '$50,000',
    features: [
      'Return Rate: 2.35x',
      'Cycle Window: 72-96 hours',
      'Priority strategy execution',
      'Large-cap allocation controls',
      'Detailed cycle governance logs',
    ],
    modalSubtitle:
      'The first high-cap VIP layer, structured for users operating larger allocations with stronger governance controls.',
    sections: [
      {
        title: 'Capital and Cycle Structure',
        items: [
          'Capital Band: 50,000 USD and above',
          'Configured Tier: 50,000 USD',
          'Cycle Duration: 72 to 96 hours',
          'Execution Mode: Priority managed allocation routing',
        ],
      },
      {
        title: 'Return and Control Model',
        items: [
          'Return Multiplier: 2.35x',
          'Payout Trigger: End-of-cycle payout event',
          'Control Layer: Large-cap exposure rules and risk throttling',
          'Reporting: High-detail cycle audit trail',
        ],
      },
      {
        title: 'Best Fit',
        items: [
          'Users moving into enterprise-style capital behavior',
          'Longer cycle preference with risk-led execution',
          'Foundation tier for institutional-style scaling',
        ],
      },
    ],
  },
  {
    id: 'vip-institutional',
    title: 'VIP Promo Pack',
    subtitle: 'Institutional-scale deployment profile',
    price: '$120,000',
    features: [
      'Return Rate: 2.80x',
      'Cycle Window: 72-96 hours',
      'Institutional capital routing',
      'Priority payout workflows',
      'Comprehensive performance governance',
    ],
    modalSubtitle:
      'Top-end VIP profile aligned with institutional-scale commitments and full-cycle governance visibility.',
    sections: [
      {
        title: 'Capital and Cycle Structure',
        items: [
          'Capital Band: 50,000 USD and above',
          'Configured Tier: 120,000 USD',
          'Cycle Duration: 72 to 96 hours',
          'Execution Mode: Institutional managed strategy routing',
        ],
      },
      {
        title: 'Return and Control Model',
        items: [
          'Return Multiplier: 2.80x',
          'Payout Trigger: Completed cycle payout settlement',
          'Control Layer: Deep risk segmentation and allocation governance',
          'Visibility: End-to-end dashboard reporting from activation to payout',
        ],
      },
      {
        title: 'Best Fit',
        items: [
          'Advanced users and institutional-style operators',
          'Large capital requiring governance and continuity',
          'Integrated with mining exposure for full Trinity strategy',
        ],
      },
    ],
  },
]

export default function InvestmentTradingPlansSection() {
  const [activePlanId, setActivePlanId] = useState<string | null>(null)

  const activePlan = useMemo(
    () => TRADING_PLANS.find(plan => plan.id === activePlanId) ?? null,
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
        <h2 className={styles.title}>Trinity Investment Trading Plans</h2>
        <p className={styles.intro}>
          Trinity investment trading plans are structured around defined capital bands, cycle
          windows, and multiplier-based outcomes. Each tier is mapped to controlled execution logic
          so users can track activation, cycle progress, and completed payouts with clear visibility.
        </p>
        <h3 className={styles.parametersTitle}>Global Trading Parameters (Applies to All Plans)</h3>
        <ul className={styles.parametersList}>
          {GLOBAL_PARAMETERS.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </header>

      <div className={styles.grid}>
        {TRADING_PLANS.map(plan => (
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
              Activate Plan
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}
