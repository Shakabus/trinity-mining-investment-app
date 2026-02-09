'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import BitryxHeader from '@/components/marketing/BitryxHeader'
import MarketingFooter from '@/components/marketing/MarketingFooter'
import MissionVisionCards from '@/components/marketing/MissionVisionCards'
import AboutWhatWeDoSection from '@/components/marketing/AboutWhatWeDoSection'
import AboutInfrastructureSection from '@/components/marketing/AboutInfrastructureSection'
import AboutWhyChooseTrinitySnake from '@/components/marketing/AboutWhyChooseTrinitySnake'
import TestimonialsCarousel from '@/components/marketing/TestimonialsCarousel'
import AboutFaqSection from '@/components/marketing/AboutFaqSection'

const TITLE_TEXT = 'Our Story'

const STORY_PARAGRAPHS = [
  'Trinity in One is a private multi-asset investment platform built to integrate high-performance cryptocurrency mining, structured investment trading, and real-asset operations into one accountable system. Our infrastructure is designed to remove fragmentation by connecting mining execution, trading strategy deployment, and portfolio reporting in a single operational environment.',
  'As of September 2025, Trinity in One oversees more than $6.6 billion in assets under management, with over $10 billion invested since inception across mining, trading, and property-backed opportunities. This includes nearly $7 billion in hotel and resort assets representing over 15,000 keys.',
  'Our system covers the full investment lifecycle, from capital structuring and development management to strategic operations and accounting controls. On the mining side, client allocations map to real hashrate tiers with uptime-focused monitoring and payout windows tied to active plan cycles. On the investment side, capital is routed through duration-based plans with defined return multipliers and risk-layered portfolio execution across crypto, forex, and broader market exposure.',
  'With offices across Miami, Los Angeles, London, and Honolulu, Trinity in One is committed to investor alignment, long-term relationships, and operational integrity while scaling a modern multi-asset infrastructure for both digital and real-world markets.',
]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function renderChar(char: string, highlighted: boolean, key: string) {
  return (
    <span
      key={key}
      className={`inline-block transition-colors duration-100 ${
        highlighted ? 'text-white' : 'text-[#2ECC711F]'
      }`}
    >
      {char === ' ' ? '\u00A0' : char}
    </span>
  )
}

export default function AboutUsPage() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const [progress, setProgress] = useState(0)

  const titleChars = useMemo(() => Array.from(TITLE_TEXT), [])
  const paragraphChars = useMemo(
    () => STORY_PARAGRAPHS.map(paragraph => Array.from(paragraph)),
    [],
  )

  const bodyCharCount = useMemo(
    () => paragraphChars.reduce((sum, chars) => sum + chars.length, 0),
    [paragraphChars],
  )
  const paragraphStartOffsets = useMemo(
    () =>
      paragraphChars.map((_, index) =>
        paragraphChars
          .slice(0, index)
          .reduce((sum, chars) => sum + chars.length, 0),
      ),
    [paragraphChars],
  )

  const totalChars = titleChars.length + bodyCharCount

  useEffect(() => {
    const updateProgress = () => {
      if (!sectionRef.current) return

      const rect = sectionRef.current.getBoundingClientRect()
      const start = window.innerHeight * 0.75
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
  const titleHighlightCount = Math.min(highlightedCount, titleChars.length)
  const bodyHighlightCount = Math.max(0, highlightedCount - titleChars.length)

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-6xl px-6 pt-6">
        <BitryxHeader />
      </div>

      <main className="mx-auto w-full max-w-5xl space-y-10 px-6 pb-12 pt-28">
        <section className="w-full py-16 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
            About Us
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-6xl">
            Trinity in One
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-sm text-white/70 md:text-base">
            We build transparent mining and investment systems designed for steady, structured growth.
          </p>
        </section>

        <section ref={sectionRef} className="w-full">
          <h2 className="font-['Poppins'] text-[2rem] font-medium leading-tight md:text-[3.2rem]">
            {titleChars.map((char, index) =>
              renderChar(char, index < titleHighlightCount, `title-${index}`),
            )}
          </h2>

          <div className="mt-5 space-y-5">
            {paragraphChars.map((chars, paragraphIndex) => {
              const paragraphStart = paragraphStartOffsets[paragraphIndex] ?? 0

              return (
                <p
                  key={`paragraph-${paragraphIndex}`}
                  className="font-['Inter'] text-[1.05rem] font-light leading-[1.55] md:text-[1.8rem] md:leading-[1.12]"
                >
                  {chars.map((char, charIndex) =>
                    renderChar(
                      char,
                      paragraphStart + charIndex < bodyHighlightCount,
                      `paragraph-${paragraphIndex}-${charIndex}`,
                    ),
                  )}
                </p>
              )
            })}
          </div>
        </section>

        <MissionVisionCards />
        <AboutWhatWeDoSection />
        <AboutInfrastructureSection />
        <AboutWhyChooseTrinitySnake />
        <TestimonialsCarousel />
        <AboutFaqSection />
      </main>

      <MarketingFooter />
    </div>
  )
}
