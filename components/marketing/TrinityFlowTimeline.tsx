'use client'

import { useEffect, useRef, useState } from 'react'
import styles from '@/components/marketing/TrinityFlowTimeline.module.css'

const FLOW_STEPS = [
  'Set a target and split capital intentionally between mining stability and investment growth.',
  'Start with a mining plan that matches your preferred cycle duration and risk tolerance.',
  'Complete payment and proof flow early so activation is not delayed by verification timing.',
  'Track mining cycle performance in the dashboard and review status transitions before making new allocations.',
  'Activate an investment trading plan with clear duration and multiplier expectations, not impulse entries.',
  'Use staggered entries across cycles instead of single large entries to improve consistency and control.',
  'Reinvest a defined portion of completed returns while keeping a reserve for withdrawals and flexibility.',
  'Rebalance between mining and investment plans based on completed cycles, current exposure, and performance data.',
  'Withdraw realized gains on schedule, review results monthly, and repeat with disciplined plan selection.',
]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export default function TrinityFlowTimeline() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const itemRefs = useRef<Array<HTMLDivElement | null>>([])
  const [progress, setProgress] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    let frame = 0

    const update = () => {
      if (!sectionRef.current) return

      const rect = sectionRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const start = viewportHeight * 0.72
      const end = viewportHeight * 0.28
      const scrollSpan = rect.height + (start - end)
      const amount = start - rect.top
      const nextProgress = clamp(amount / scrollSpan, 0, 1)

      setProgress(nextProgress)

      const triggerY = viewportHeight * 0.52
      let current = 0
      itemRefs.current.forEach((item, index) => {
        if (!item) return
        const itemRect = item.getBoundingClientRect()
        const centerY = itemRect.top + itemRect.height / 2
        if (centerY <= triggerY) {
          current = index
        }
      })
      setActiveIndex(current)
    }

    const onScrollOrResize = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        update()
      })
    }

    update()
    window.addEventListener('scroll', onScrollOrResize, { passive: true })
    window.addEventListener('resize', onScrollOrResize)

    return () => {
      window.removeEventListener('scroll', onScrollOrResize)
      window.removeEventListener('resize', onScrollOrResize)
      if (frame) {
        window.cancelAnimationFrame(frame)
      }
    }
  }, [])

  return (
    <section className={styles.section} ref={sectionRef}>
      <div className={styles.wrapper}>
        <header className={styles.heading}>
          <h2>The Trinity Mining &amp; Investment Flow</h2>
          <p>
            A practical sequence for users who want structured participation, compounding discipline,
            and better long-term outcomes across both mining and investment plans.
          </p>
        </header>

        <div className={styles.timeline}>
          <div className={styles.lineBase} />
          <div
            className={styles.lineHighlight}
            style={{ transform: `scaleY(${progress})` }}
            aria-hidden="true"
          />

          <div className={styles.items}>
            {FLOW_STEPS.map((step, index) => {
              const number = String(index + 1).padStart(2, '0')
              const sideClass = index % 2 === 0 ? styles.right : styles.left
              const activeClass = index <= activeIndex ? styles.active : ''

              return (
                <div
                  key={number}
                  ref={el => {
                    itemRefs.current[index] = el
                  }}
                  className={`${styles.item} ${sideClass} ${activeClass}`}
                >
                  <article className={styles.content}>
                    <span className={styles.number}>{number}</span>
                    <h3 className={styles.text}>{step}</h3>
                  </article>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

