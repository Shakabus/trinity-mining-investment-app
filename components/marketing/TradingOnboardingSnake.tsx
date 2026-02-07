'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Alumni_Sans } from 'next/font/google'
import styles from '@/components/marketing/TradingOnboardingSnake.module.css'

const alumniSans = Alumni_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
})

const STEP_DATA = [
  'Enable the Investment Trading module from your existing dashboard and keep one wallet profile for mining and trading payouts.',
  'Select a managed portfolio plan that matches your preferred pace, payout window, and total capital allocation.',
  'Complete funding details and submit transaction proof so verification, risk controls, and strategy routing can begin.',
  'Once approved, our desks deploy your capital across crypto, stocks, and property-linked positions using live allocation rules.',
  'Track performance in real time, monitor realized P/L and equity growth, then request withdrawals as each cycle completes.',
]

const STEP_THRESHOLDS = [0.08, 0.25, 0.45, 0.64, 0.82]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export default function TradingOnboardingSnake() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const updateProgress = () => {
      if (!sectionRef.current) return
      const rect = sectionRef.current.getBoundingClientRect()
      const total = rect.height + window.innerHeight
      const passed = window.innerHeight - rect.top
      setProgress(clamp(passed / total, 0, 1))
    }

    updateProgress()
    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)

    return () => {
      window.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateProgress)
    }
  }, [])

  const dashOffset = useMemo(() => 4000 - progress * 4000, [progress])

  return (
    <section ref={sectionRef} className={`${styles.snakeSection} ${alumniSans.className}`}>
      <div className={styles.heading}>
        <p className={styles.intro}>
          Further Elavate your Trinity experience with our profitable Investment trading easy onboarding process.
        </p>
      </div>

      <svg viewBox="0 0 1200 650" className={styles.snakeSvg} preserveAspectRatio="none" aria-hidden="true">
        <path
          className={styles.snakeLineBg}
          d="
            M 175 70
            L 775 70
            Q 1075 70 1075 140
            Q 1075 210 775 210
            L 375 210
            Q 175 210 175 280
            Q 175 350 375 350
            L 775 350
            Q 1075 350 1075 420
            Q 1075 490 775 490
            L 375 490
          "
        />
        <path
          className={styles.snakeLine}
          style={{ strokeDashoffset: dashOffset }}
          d="
            M 175 70
            L 775 70
            Q 1075 70 1075 140
            Q 1075 210 775 210
            L 375 210
            Q 175 210 175 280
            Q 175 350 375 350
            L 775 350
            Q 1075 350 1075 420
            Q 1075 490 775 490
            L 375 490
          "
        />
      </svg>

      <div className={styles.snakeSteps}>
        {STEP_DATA.map((text, index) => {
          const stepNumber = String(index + 1)
          const stepClass = styles[`s${index + 1}` as keyof typeof styles] || ''
          const isActive = progress >= STEP_THRESHOLDS[index]

          return (
            <div
              key={stepNumber}
              className={`${styles.snakeStep} ${stepClass} ${isActive ? styles.active : ''}`}
            >
              <span>{stepNumber}</span>
              <p>{text}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
