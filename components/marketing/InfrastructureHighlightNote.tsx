'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import styles from '@/components/marketing/InfrastructureHighlightNote.module.css'

const NOTE_TEXT =
  'Our mining infrastructure is built around reliability, scalability, and performance. Trinity in One operates across multiple data center locations selected for stable power availability, low-latency connectivity, and operational efficiency.'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export default function InfrastructureHighlightNote() {
  const sectionRef = useRef<HTMLDivElement | null>(null)
  const [progress, setProgress] = useState(0)

  const words = useMemo(() => NOTE_TEXT.split(' '), [])
  const wordChars = useMemo(() => words.map(word => Array.from(word)), [words])
  const totalChars = useMemo(() => Array.from(NOTE_TEXT).length, [])
  const wordStartOffsets = useMemo(
    () =>
      wordChars.map((_, index) =>
        wordChars
          .slice(0, index)
          .reduce((sum, chars) => sum + chars.length + 1, 0),
      ),
    [wordChars],
  )

  useEffect(() => {
    const updateProgress = () => {
      if (!sectionRef.current) return

      const rect = sectionRef.current.getBoundingClientRect()
      const start = window.innerHeight * 0.7
      const end = window.innerHeight * 0.3
      const scrollSpan = rect.height + (start - end)
      const amount = start - rect.top
      setProgress(clamp(amount / scrollSpan, 0, 1))
    }

    updateProgress()
    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)

    return () => {
      window.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateProgress)
    }
  }, [])

  const highlightedCount = Math.floor(progress * totalChars)

  return (
    <div ref={sectionRef} className={styles.container}>
      <p className={styles.subtitle}>
        {wordChars.map((chars, wordIndex) => {
          const start = wordStartOffsets[wordIndex] ?? 0
          const isLastWord = wordIndex === wordChars.length - 1

          return (
            <span key={`word-${wordIndex}`}>
              <span className={styles.word}>
                {chars.map((char, charIndex) => (
                  <span
                    key={`char-${wordIndex}-${charIndex}`}
                    className={`${styles.char} ${
                      start + charIndex < highlightedCount ? styles.highlighted : ''
                    }`}
                  >
                    {char}
                  </span>
                ))}
              </span>
              {!isLastWord && (
                <span
                  className={`${styles.char} ${
                    start + chars.length < highlightedCount ? styles.highlighted : ''
                  }`}
                  style={{ whiteSpace: 'pre' }}
                >
                  {' '}
                </span>
              )}
            </span>
          )
        })}
      </p>
    </div>
  )
}
