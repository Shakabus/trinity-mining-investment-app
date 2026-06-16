'use client'

import { useEffect, useState } from 'react'
import styles from '@/components/marketing/InteractiveKnowledgeHub.module.css'

type HubItem = {
  id: string
  title: string
  preview: string
  details: string[]
}

const HUB_ITEMS: HubItem[] = [
  {
    id: 'modal1',
    title: 'What Is Crypto Mining Investment',
    preview:
      'Crypto mining investment is the allocation of capital into infrastructure that secures blockchain networks and validates transactions. In systems like Bitcoin, rewards are earned for contributing computational power...',
    details: [
      'Crypto mining investment is the act of allocating capital toward the computational process that secures a blockchain network and validates transactions. In proof-of-work systems like Bitcoin, miners compete to solve cryptographic puzzles and earn block rewards plus transaction fees.',
      'Trinity in One removes traditional barriers such as hardware procurement, power planning, and operational complexity. Instead of owning physical rigs, users access structured hashrate allocations and monitor outcomes through a unified dashboard.',
    ],
  },
  {
    id: 'modal6',
    title: 'How Structured Investment Plans Work',
    preview:
      'Trinity in One investment plans are built around defined capital tiers, cycle durations, and return multipliers. Users choose a plan that matches risk appetite and timeline, then track execution through transparent status flow...',
    details: [
      'Investment plans on Trinity in One are designed with clear inputs and outputs: entry amount, duration window, and projected multiplier framework. This gives users a disciplined structure for participation rather than ad hoc decision-making.',
      'Each plan cycle follows a visible progression in the dashboard so users can track activation, in-cycle status, and completion before rolling into new allocations.',
    ],
  },
  {
    id: 'modal7',
    title: 'Risk Management for Better Compounding',
    preview:
      'Consistent long-term growth comes from allocation discipline. Trinity in One users can combine mining stability with investment growth and rebalance by cycle performance instead of overexposing a single strategy...',
    details: [
      'A practical approach is to split capital between mining and investment plans, then rebalance based on completed cycles and account objectives.',
      'Trinity in One emphasizes measured compounding: reinvest a defined portion of realized gains, maintain withdrawal reserves, and avoid concentration risk in a single cycle or product path.',
    ],
  },
  {
    id: 'modal8',
    title: 'Payout Planning and Reinvestment Discipline',
    preview:
      'Maximizing outcomes is not only about entry points. It is also about payout timing, reserve management, and reinvestment rules. Structured execution helps users protect gains while still scaling exposure...',
    details: [
      'Users can improve consistency by planning payout windows in advance, separating realized gains from reinvestment capital, and reviewing performance cycle by cycle.',
      'Within Trinity in One, status tracking, order history, and cycle visibility support this process so growth decisions are made on data, not emotion.',
    ],
  },
  {
    id: 'modal9',
    title: 'Asset Types in the Trinity in One Ecosystem',
    preview:
      'Trinity in One operates across multiple asset categories: crypto mining allocations, structured investment trading exposure, and real-asset strategy including property and hospitality-linked holdings...',
    details: [
      'The ecosystem is multi-asset by design, combining digital and real-world exposure in one operating framework.',
      'Core categories include cryptocurrency mining infrastructure, managed investment strategies across market instruments, and real-asset participation such as real estate and hospitality portfolios.',
      'This structure helps users diversify across different return drivers while monitoring activity from one dashboard environment.',
    ],
  },
  {
    id: 'modal2',
    title: 'Understanding Hash Rates in Crypto Mining',
    preview:
      'Hash rate is the number of cryptographic calculations a mining system can perform per second. In proof-of-work networks, this directly influences contribution share and reward distribution...',
    details: [
      'Hash rate is the core performance metric in mining. At the user level, it reflects allocated computational capacity. At the network level, it reflects total security and competition.',
      'In Trinity in One mining plans, hashrate allocation is mapped into plan structure so users can monitor expected performance context against network conditions.',
    ],
  },
  {
    id: 'modal3',
    title: 'How Hash Rates Are Measured',
    preview:
      'Hash rates are measured in H/s, then scaled into KH/s, MH/s, GH/s, TH/s, PH/s, and EH/s. Modern mining operations typically run in TH/s and above...',
    details: [
      'Hash rates are measured in hashes per second and scaled by magnitude. Operational mining usually references TH/s, PH/s, or EH/s depending on scope.',
      'In managed environments like Trinity in One, users see allocation and effective performance through dashboard metrics rather than direct hardware management.',
    ],
  },
  {
    id: 'modal4',
    title: 'Why Hash Rates Matter',
    preview:
      'Hash rate affects both potential rewards and network security. Higher contribution generally means greater reward share in pool systems, while higher network hash rate also increases mining competition...',
    details: [
      'At plan level, hash rate impacts output potential. At network level, it influences competitive difficulty and ecosystem security.',
      'Understanding this relationship helps Trinity in One users evaluate mining cycles realistically and align reinvestment decisions with operating conditions.',
    ],
  },
  {
    id: 'modal5',
    title: 'Key Terminologies in Mining and Investing',
    preview:
      'Understanding core terms such as blockchain, proof of work, mining difficulty, portfolio allocation, cycle duration, and ROI helps users navigate Trinity in One with confidence...',
    details: [
      'Mining terms include blockchain, proof of work, ASIC, mining difficulty, and block rewards. Investment terms include allocation, cycle duration, multiplier, portfolio exposure, and realized return.',
      'Knowing these concepts helps users interpret dashboard activity correctly and make better decisions across both mining and investment workflows.',
    ],
  },
]

export default function InteractiveKnowledgeHub() {
  const [activeModalId, setActiveModalId] = useState<string | null>(null)

  useEffect(() => {
    if (!activeModalId) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveModalId(null)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeModalId])

  useEffect(() => {
    document.body.style.overflow = activeModalId ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [activeModalId])

  return (
    <section className={styles.wrapper}>
      <header className={styles.header}>
        <h2 className={styles.title}>Interactive Knowledge Hub</h2>
        <p className={styles.subtitle}>
          Learn the fundamentals of mining, investment execution, and multi-asset strategy inside
          Trinity in One.
        </p>
      </header>

      <div className={styles.grid}>
        {HUB_ITEMS.map(item => (
          <article
            key={item.id}
            className={styles.card}
            onClick={() => setActiveModalId(item.id)}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setActiveModalId(item.id)
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`Open ${item.title}`}
          >
            <h3 className={styles.cardTitle}>{item.title}</h3>
            <p className={styles.cardPreview}>{item.preview}</p>
            <button type="button" className={styles.readMore}>
              Read More
            </button>
          </article>
        ))}
      </div>

      {HUB_ITEMS.map(item => {
        const open = activeModalId === item.id
        return (
          <div
            key={`overlay-${item.id}`}
            className={`${styles.modalOverlay} ${open ? styles.modalOverlayActive : ''}`}
            onClick={() => setActiveModalId(null)}
            aria-hidden={!open}
          >
            <div className={styles.modalContent} onClick={event => event.stopPropagation()}>
              <button
                type="button"
                className={styles.close}
                onClick={() => setActiveModalId(null)}
                aria-label="Close modal"
              >
                &times;
              </button>
              <h3 className={styles.modalTitle}>{item.title}</h3>
              {item.details.map(text => (
                <p key={text} className={styles.modalText}>
                  {text}
                </p>
              ))}
            </div>
          </div>
        )
      })}
    </section>
  )
}

