'use client'

import { useState } from 'react'
import styles from '@/components/marketing/HowItWorksFaqSection.module.css'

type FaqItem = {
  question: string
  answer: string
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'How is my purchased hash rate assigned to real mining machines?',
    answer:
      'When you activate a mining plan, Trinity in One maps your allocation to live infrastructure capacity by plan tier. Your dashboard reflects status progression from order creation to active cycle and payout tracking.',
  },
  {
    question: 'What happens if mining difficulty increases during my contract?',
    answer:
      'Mining performance is always affected by network conditions, including difficulty changes. Trinity keeps operations running with infrastructure-level optimization, but output can vary as network difficulty and block economics shift.',
  },
  {
    question: 'How does Trinity in One decide which mining pool to route to?',
    answer:
      'Pool routing is managed through uptime, latency, and effective performance signals. The objective is to maintain stable operational efficiency across plan allocations while preserving transparent reporting in your account.',
  },
  {
    question: 'What exactly am I earning in mining plans?',
    answer:
      'Mining plans generate rewards based on active hashrate allocation, pool performance, and network conditions. Your account tracks plan status, cycle progression, and payout outcomes rather than direct solo block ownership.',
  },
  {
    question: 'Why can earnings change even when my hash rate stays the same?',
    answer:
      'Hash rate is only one variable. Network difficulty, transaction fee environment, pool luck, and market movement can all change realized outcomes over time.',
  },
  {
    question: 'How are maintenance and electricity charges handled?',
    answer:
      'Trinity in One applies operational cost logic per plan structure and infrastructure profile. Relevant cost effects are reflected through cycle results and dashboard records to keep performance reporting clear.',
  },
  {
    question: 'What happens if a machine goes offline or enters maintenance?',
    answer:
      'Operations are managed with redundancy and monitoring controls. If hardware events occur, routing and recovery procedures are applied to protect continuity and minimize cycle disruption.',
  },
  {
    question: 'Can I scale my mining allocation during an active cycle?',
    answer:
      'Scaling is handled by plan workflow. In most cases, users increase allocation by activating a new eligible plan tier or renewing with higher capacity at cycle boundaries.',
  },
  {
    question: 'How do investment trading plans work on Trinity in One?',
    answer:
      'Investment plans follow defined capital bands, duration windows, and return multipliers. After plan activation, the cycle is managed by the strategy engine and moves through pending, active, and completed states in your dashboard.',
  },
  {
    question: 'How are trading payouts calculated?',
    answer:
      'Trading payouts follow the selected return multiplier for the activated tier and are processed at cycle completion. The system records order value, cycle timing, multiplier, and payout status for full visibility.',
  },
  {
    question: 'Can I run mining and investment plans at the same time?',
    answer:
      'Yes. Trinity in One is built as a unified operating system where mining and investment plans can run in parallel, each with independent cycle states and reporting, but managed from one account.',
  },
  {
    question: 'How can I use both mining and trading for better structure?',
    answer:
      'A common approach is to use mining for steady infrastructure-backed exposure while using trading plans for cycle-based growth. Users typically rebalance after completed cycles based on performance and risk preferences.',
  },
  {
    question: 'What happens when a plan reaches completion?',
    answer:
      'When a cycle completes, status is updated in your dashboard and payout flow is triggered according to the plan structure. You can then withdraw where eligible or redeploy capital into another plan tier.',
  },
  {
    question: 'Where can I monitor all activity in real time?',
    answer:
      'The Trinity in One dashboard is the central control layer for mining plans, trading plans, cycle status, proofs, payouts, and historical activity logs.',
  },
]

export default function HowItWorksFaqSection() {
  const [openIndexes, setOpenIndexes] = useState<number[]>([])

  const toggleItem = (index: number) => {
    setOpenIndexes(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index],
    )
  }

  return (
    <section className={styles.container} aria-labelledby="how-it-works-faq-title">
      <div className={styles.wrapper}>
        <h2 id="how-it-works-faq-title" className={styles.title}>
          Frequently Asked Questions
        </h2>

        {FAQ_ITEMS.map((item, index) => {
          const isOpen = openIndexes.includes(index)
          return (
            <article
              key={item.question}
              className={`${styles.item} ${isOpen ? styles.itemActive : ''}`}
            >
              <button
                type="button"
                className={styles.question}
                onClick={() => toggleItem(index)}
                aria-expanded={isOpen}
                aria-controls={`how-it-works-faq-panel-${index}`}
              >
                <span className={styles.questionText}>{item.question}</span>
                <span className={`${styles.icon} ${isOpen ? styles.iconOpen : ''}`} aria-hidden="true">
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>

              <div
                id={`how-it-works-faq-panel-${index}`}
                className={`${styles.answer} ${isOpen ? styles.answerOpen : ''}`}
              >
                <p className={styles.answerText}>{item.answer}</p>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
