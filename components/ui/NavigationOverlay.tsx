'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Spinner from '@/components/ui/Spinner'

export default function NavigationOverlay() {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return
      const anchor = target.closest('a')
      if (!anchor) return

      const href = anchor.getAttribute('href') || ''
      const targetAttr = anchor.getAttribute('target')
      const isExternal = href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')
      const isNewTab = targetAttr === '_blank'

      if (isExternal || isNewTab) return
      if (!href.startsWith('/')) return

      setIsVisible(true)
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  useEffect(() => {
    if (!isVisible) return
    const timeout = setTimeout(() => setIsVisible(false), 1200)
    return () => clearTimeout(timeout)
  }, [isVisible])

  useEffect(() => {
    setIsVisible(false)
  }, [pathname])

  return (
    <div
      className={`fixed inset-0 z-[9998] flex items-center justify-center transition-opacity ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        pointerEvents: 'none',
        background: 'rgba(5, 8, 18, 0.28)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        className="px-4 py-2 rounded-full flex items-center gap-2 text-sm"
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: '#ffffff',
        }}
      >
        <Spinner className="text-white" />
        Loading...
      </div>
    </div>
  )
}
