'use client'

import { useEffect } from 'react'

export default function TradingSectionObserver() {
  useEffect(() => {
    const section = document.getElementById('plans')
    if (!section) return

    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0]
        if (entry.isIntersecting) {
          window.history.replaceState(null, '', '#plans')
        } else if (window.location.hash === '#plans') {
          window.history.replaceState(null, '', window.location.pathname)
        }
      },
      { threshold: 0.4 }
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  return null
}
