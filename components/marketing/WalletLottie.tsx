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

export default function WalletLottie() {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let animation: { destroy: () => void } | null = null
    let scriptEl: HTMLScriptElement | null = null
    let cancelled = false

    const resolvePath = async () => {
      const candidates = ['/lottie/Crypto-Wallet.json', '/lottie/Crypto%20Wallet.json']
      for (const candidate of candidates) {
        try {
          const response = await fetch(candidate, { method: 'HEAD' })
          if (response.ok) return candidate
        } catch {
          // Ignore and try the next candidate.
        }
      }
      return candidates[0]
    }

    const start = async () => {
      if (!containerRef.current || !window.lottie) return
      const path = await resolvePath()
      if (cancelled || !containerRef.current || !window.lottie) return
      animation = window.lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path,
      })
    }

    if (window.lottie) {
      void start()
    } else {
      scriptEl = document.createElement('script')
      scriptEl.src = 'https://unpkg.com/lottie-web/build/player/lottie.min.js'
      scriptEl.async = true
      scriptEl.onload = () => {
        void start()
      }
      document.body.appendChild(scriptEl)
    }

    return () => {
      cancelled = true
      animation?.destroy()
      if (scriptEl) {
        scriptEl.remove()
      }
    }
  }, [])

  return <div ref={containerRef} className="h-[320px] w-full max-w-[560px] md:h-[420px]" />
}
