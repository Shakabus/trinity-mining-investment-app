'use client'

import { useState } from 'react'
import styles from '@/components/marketing/AboutFaqSection.module.css'

type FaqItem = {
  question: string
  answer: string
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'What is Trinity in One and why was it created?',
    answer:
      'Trinity in One was built to unify cloud mining, structured investment trading, and real-asset strategy in one operating system. The goal is to reduce fragmentation and give users a clear path from plan activation to monitored performance and payout.',
  },
  {
    question: 'How does Trinity in One cloud mining work?',
    answer:
      'When you activate a mining plan, your allocation maps to live hashrate capacity managed by our infrastructure team. Rewards are generated based on active plan terms, network conditions, and operational uptime.',
  },
  {
    question: 'Do I need mining hardware or technical knowledge to participate?',
    answer:
      'No. Trinity in One handles the infrastructure layer including hardware operations, maintenance, and optimization. Users manage plan activity and status directly from their dashboard.',
  },
  {
    question: 'What investment plans are available on Trinity in One?',
    answer:
      'The platform provides structured investment plans with defined capital tiers, duration windows, and return multipliers. Plans are designed to support different risk profiles and portfolio objectives.',
  },
  {
    question: 'How are investment returns and payouts handled?',
    answer:
      'Returns follow the selected plan structure and completion cycle. Once a cycle is completed and validated in the system flow, payout status is updated in your account and processed according to platform timelines.',
  },
  {
    question: 'Can I run mining and investment plans at the same time?',
    answer:
      'Yes. Trinity in One is designed as a multi-product environment where mining and investment activity can run in parallel, each with its own status flow, monitoring, and reporting.',
  },
  {
    question: 'How does Trinity in One manage operational and strategy risk?',
    answer:
      'Risk controls are applied through layered execution rules, duration-based plans, and portfolio segmentation. Performance is monitored continuously, and updates are reflected through dashboard status states.',
  },
  {
    question: 'What makes Trinity in One different from a standard mining app?',
    answer:
      'Trinity in One combines infrastructure operations with investment execution in one system. Instead of isolated tools, users get integrated monitoring across mining, trading, and asset-backed strategy from a single dashboard.',
  },
  {
    question: 'Who is behind Trinity in One?',
    answer:
      'Trinity in One operates as a private multi-asset investment platform with infrastructure teams, trading operations, and real-asset experience coordinated under one execution framework.',
  },
  {
    question: 'Is performance guaranteed on Trinity in One?',
    answer:
      'No. All mining and investment outcomes are performance-dependent and influenced by market and network conditions. Trinity in One focuses on transparent structure, realistic execution, and clear reporting.',
  },
  {
    question: 'How can I track my account activity in real time?',
    answer:
      'Your dashboard provides real-time visibility into order states, active plans, proof status, and cycle progress. You can review both current activity and historical records from the same interface.',
  },
  {
    question: 'How do I get help if I need support?',
    answer:
      'You can reach support through the platform support channels. Trinity in One support is structured to help with onboarding, payment flow questions, plan status clarification, and account-level guidance.',
  },
]

export default function AboutFaqSection() {
  const [openIndexes, setOpenIndexes] = useState<number[]>([])

  const toggleItem = (index: number) => {
    setOpenIndexes(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index],
    )
  }

  return (
    <section className={styles.container} aria-labelledby="about-faq-title">
      <div className={styles.wrapper}>
        <h2 id="about-faq-title" className={styles.title}>
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
                aria-controls={`faq-panel-${index}`}
              >
                <span className={styles.questionText}>{item.question}</span>
                <span className={`${styles.icon} ${isOpen ? styles.iconOpen : ''}`} aria-hidden="true">
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>

              <div
                id={`faq-panel-${index}`}
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

