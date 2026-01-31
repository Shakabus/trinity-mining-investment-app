'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function RouteProgress() {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const firstRun = useRef(true)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }

    setIsVisible(true)
    setProgress(20)
    const start = setTimeout(() => setProgress(75), 120)
    const finish = setTimeout(() => {
      setProgress(100)
      const hide = setTimeout(() => {
        setIsVisible(false)
        setProgress(0)
      }, 200)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = hide
    }, 500)

    return () => {
      clearTimeout(start)
      clearTimeout(finish)
    }
  }, [pathname])

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        zIndex: 9999,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 200ms ease',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #60a5fa, #a78bfa, #34d399)',
          transition: 'width 300ms ease',
          boxShadow: '0 0 12px rgba(96, 165, 250, 0.6)',
        }}
      />
    </div>
  )
}
