'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import styles from '@/components/marketing/HowFlowHighlightLottieSection.module.css'

const TITLE_TEXT = 'Built for Measurable Growth'
const SUBTITLE_TEXT =
  'Trinity in One is designed as a full operating system for multi-asset participation, not a single-purpose tool. Mining infrastructure, structured investment cycles, and portfolio-level visibility are connected in one platform so users can track activation, execution, and payout with clear status flow and disciplined decision points.'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function renderChar(char: string, highlighted: boolean, key: string) {
  return (
    <span
      key={key}
      className={`${styles.char} ${highlighted ? styles.charHighlighted : ''}`}
    >
      {char === ' ' ? '\u00A0' : char}
    </span>
  )
}

function renderHighlightedText(text: string, highlightedCount: number, keyPrefix: string) {
  const words = text.split(' ')

  return words.flatMap((word, wordIndex) => {
    const wordStartIndex = words
      .slice(0, wordIndex)
      .reduce((sum, currentWord) => sum + currentWord.length + 1, 0)

    const nodes = [
      <span key={`${keyPrefix}-word-${wordIndex}`} className={styles.word}>
        {Array.from(word).map((char, charIndex) =>
          renderChar(
            char,
            wordStartIndex + charIndex < highlightedCount,
            `${keyPrefix}-${wordIndex}-${charIndex}`,
          ),
        )}
      </span>,
    ]

    if (wordIndex < words.length - 1) {
      nodes.push(
        renderChar(
          ' ',
          wordStartIndex + word.length < highlightedCount,
          `${keyPrefix}-space-${wordIndex}`,
        ),
      )
    }

    return nodes
  })
}

export default function HowFlowHighlightLottieSection() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const lottieRef = useRef<HTMLDivElement | null>(null)
  const [progress, setProgress] = useState(0)

  const titleChars = useMemo(() => Array.from(TITLE_TEXT), [])
  const subtitleChars = useMemo(() => Array.from(SUBTITLE_TEXT), [])
  const totalChars = titleChars.length + subtitleChars.length

  useEffect(() => {
    const updateProgress = () => {
      if (!sectionRef.current) return
      const rect = sectionRef.current.getBoundingClientRect()
      const start = window.innerHeight * 0.82
      const end = window.innerHeight * 0.48
      const span = Math.max(1, rect.height + (start - end))
      const amount = start - rect.top
      setProgress(clamp((amount / span) * 1.35, 0, 1))
    }

    updateProgress()
    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)
    return () => {
      window.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateProgress)
    }
  }, [])

  useEffect(() => {
    let animation: { destroy: () => void } | null = null
    let cancelled = false

    const candidatePaths = ['/lottie/Revenue.json', '/lottie/revenue.json', '/lottie/REVENUE.json']

    const start = async () => {
      if (!lottieRef.current || cancelled) return

      const lottie = (await import('lottie-web')).default
      let animationData: unknown = null

      for (const candidatePath of candidatePaths) {
        try {
          const response = await fetch(candidatePath, { cache: 'no-store' })
          if (!response.ok) continue
          animationData = await response.json()
          break
        } catch {
          // try next path
        }
      }

      if (!animationData || !lottieRef.current || cancelled) return

      lottieRef.current.innerHTML = ''
      animation = lottie.loadAnimation({
        container: lottieRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData,
      })
    }

    void start()

    return () => {
      cancelled = true
      animation?.destroy()
    }
  }, [])

  const highlightedCount = Math.floor(progress * totalChars)
  const titleHighlightCount = Math.min(highlightedCount, titleChars.length)
  const subtitleHighlightCount = Math.max(0, highlightedCount - titleChars.length)

  return (
    <section ref={sectionRef} className={styles.section}>
      <div className={styles.row}>
        <div className={styles.left}>
          <h2 className={styles.title}>
            {renderHighlightedText(TITLE_TEXT, titleHighlightCount, 'title')}
          </h2>

          <p className={styles.subtitle}>
            {renderHighlightedText(SUBTITLE_TEXT, subtitleHighlightCount, 'subtitle')}
          </p>

          <div className={styles.ctaWrap}>
            <Link href="/sign-up" className="glass-button">
              Get Started
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>

        <div className={styles.right}>
          <div ref={lottieRef} className={styles.lottieBox} aria-hidden="true" />
        </div>
      </div>
    </section>
  )
}
