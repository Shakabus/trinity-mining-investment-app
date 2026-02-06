'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    lottie?: {
      loadAnimation: (options: {
        container: HTMLElement
        renderer: 'svg' | 'canvas' | 'html'
        loop: boolean
        autoplay: boolean
        path: string
      }) => { destroy: () => void }
    }
  }
}

export default function HeroLottie() {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let animation: { destroy: () => void } | null = null
    let scriptEl: HTMLScriptElement | null = null

    const start = () => {
      if (!containerRef.current || !window.lottie) return
      animation = window.lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: '/lottie/hero.json',
      })
    }

    if (window.lottie) {
      start()
    } else {
      scriptEl = document.createElement('script')
      scriptEl.src = 'https://unpkg.com/lottie-web/build/player/lottie.min.js'
      scriptEl.async = true
      scriptEl.onload = start
      document.body.appendChild(scriptEl)
    }

    return () => {
      animation?.destroy()
      if (scriptEl) {
        scriptEl.remove()
      }
    }
  }, [])

  return <div ref={containerRef} className="h-[420px] w-full md:h-[520px]" />
}
