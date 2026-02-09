'use client'

import { useMemo, useRef, useState } from 'react'
import styles from '@/components/marketing/TestimonialsCarousel.module.css'

type Testimonial = {
  name: string
  text: string
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Olivia K.',
    text: 'What won me over was visibility. I can see exactly what plan stage I am in, what is pending, and what is completed without chasing support for basic updates.',
  },
  {
    name: 'David R.',
    text: 'I came in for mining exposure and ended up appreciating the trading structure as well. The dashboard keeps both sides organized, so I never feel lost between products.',
  },
  {
    name: 'Nadia P.',
    text: 'Customer support has been consistently calm and clear. Questions are answered with context, not copy-paste replies, which makes a big difference when money is involved.',
  },
  {
    name: 'Ethan M.',
    text: 'The payout flow is straightforward. You know what is required, where your proof sits, and when status changes. That process discipline gave me confidence quickly.',
  },
  {
    name: 'Marina T.',
    text: 'I am not technical, but the platform is understandable. The plan labels, progress states, and activity timeline make it easy to follow without guessing.',
  },
  {
    name: 'Harold J.',
    text: 'Risk framing is realistic. I appreciate that returns are presented with structure and timing, not hype. It feels like operations first, marketing second.',
  },
  {
    name: 'Sofia A.',
    text: 'The referral and rewards sections are transparent. I can track what is earned, why it was earned, and where it appears in the account balance.',
  },
  {
    name: 'Liam W.',
    text: 'I like that mining and investment activity live in one environment. Instead of splitting across apps, I can monitor performance and decisions from one dashboard.',
  },
  {
    name: 'Grace I.',
    text: 'From onboarding to activation, the flow is clear. Every step tells you what comes next, and that reduced the usual friction I see on similar platforms.',
  },
  {
    name: 'Noah C.',
    text: 'The interface stays fast even with a lot of account history. That matters when reviewing orders, comparing plan cycles, and checking withdrawal records.',
  },
  {
    name: 'Amina S.',
    text: 'What stands out is accountability. Status updates are traceable, portfolio sections are segmented cleanly, and nothing feels hidden behind vague labels.',
  },
  {
    name: 'Victor L.',
    text: 'I value the professional tone of the system. It treats capital seriously, and the platform design reflects that with structured execution and clean reporting.',
  },
]

function clampIndex(index: number, length: number) {
  if (index < 0) return length - 1
  if (index >= length) return 0
  return index
}

export default function TestimonialsCarousel() {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState<'next' | 'prev'>('next')
  const startXRef = useRef<number | null>(null)
  const touchActiveRef = useRef(false)

  const total = TESTIMONIALS.length
  const currentItem = TESTIMONIALS[current]

  const cardClass = useMemo(
    () => `${styles.card} ${direction === 'next' ? styles.flipNext : styles.flipPrev}`,
    [current, direction],
  )

  const goNext = () => {
    setDirection('next')
    setCurrent(prev => clampIndex(prev + 1, total))
  }

  const goPrev = () => {
    setDirection('prev')
    setCurrent(prev => clampIndex(prev - 1, total))
  }

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    touchActiveRef.current = true
    startXRef.current = event.clientX
  }

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!touchActiveRef.current || startXRef.current === null) return
    const delta = event.clientX - startXRef.current
    touchActiveRef.current = false
    startXRef.current = null

    if (Math.abs(delta) < 45) return
    if (delta < 0) {
      goNext()
    } else {
      goPrev()
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <h2>Clients & Investors Testimonials</h2>
      </div>

      <div className={styles.shell} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        <div className={`${styles.deckLayer} ${styles.layerOne}`} />
        <div className={`${styles.deckLayer} ${styles.layerTwo}`} />

        <button
          type="button"
          className={`${styles.control} ${styles.controlLeft}`}
          onClick={goPrev}
          aria-label="Previous testimonial"
        >
          <svg viewBox="0 0 24 24">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <article className={cardClass} key={`${current}-${direction}`}>
          <p className={styles.quote}>"{currentItem.text}"</p>
          <div className={styles.meta}>
            <span className={styles.dot} />
            <span>{currentItem.name}</span>
          </div>
        </article>

        <button
          type="button"
          className={`${styles.control} ${styles.controlRight}`}
          onClick={goNext}
          aria-label="Next testimonial"
        >
          <svg viewBox="0 0 24 24">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <p className={styles.index}>
        {String(current + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </p>
    </section>
  )
}
