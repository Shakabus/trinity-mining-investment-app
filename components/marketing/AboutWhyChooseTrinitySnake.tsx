'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Alumni_Sans } from 'next/font/google'
import styles from '@/components/marketing/AboutWhyChooseTrinitySnake.module.css'

const alumniSans = Alumni_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
})

const STEP_DATA = [
  'Transparent reward tracking and reporting',
  'Real-time monitoring through user dashboards',
  'Clearly outlined service terms',
  'Infrastructure-first operations rather than speculative models',
  'Infrastructure and data protection at every layer',
]

const STEP_THRESHOLDS = [0.08, 0.25, 0.45, 0.64, 0.82]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export default function AboutWhyChooseTrinitySnake() {
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
        <h2>Why Choose Trinity</h2>
      </div>

      <svg viewBox="0 0 1200 650" className={styles.snakeSvg} preserveAspectRatio="none" aria-hidden="true">
        <path
          className={styles.snakeLineBg}
          d="
            M 50 70
            L 650 70
            Q 950 70 950 140
            Q 950 210 650 210
            L 250 210
            Q 50 210 50 280
            Q 50 350 250 350
            L 650 350
            Q 950 350 950 420
            Q 950 490 650 490
            L 250 490
          "
        />
        <path
          className={styles.snakeLine}
          style={{ strokeDashoffset: dashOffset }}
          d="
            M 50 70
            L 650 70
            Q 950 70 950 140
            Q 950 210 650 210
            L 250 210
            Q 50 210 50 280
            Q 50 350 250 350
            L 650 350
            Q 950 350 950 420
            Q 950 490 650 490
            L 250 490
          "
        />
      </svg>

      <div className={styles.snakeSteps}>
        {STEP_DATA.map((text, index) => {
          const stepNumber = String(index + 1).padStart(2, '0')
          const stepClass = styles[`s${index + 1}` as keyof typeof styles] || ''
          const isActive = progress >= STEP_THRESHOLDS[index]

          return (
            <div key={stepNumber} className={`${styles.snakeStep} ${stepClass} ${isActive ? styles.active : ''}`}>
              <span>{stepNumber}</span>
              <p>{text}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
