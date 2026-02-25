'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export default function SupportFab() {
  const pathname = usePathname()
  const isUserDashboard = pathname?.startsWith('/dashboard')
  const supportHref = isUserDashboard ? '/dashboard/support' : '/contact'
  const [isDesktopViewport, setIsDesktopViewport] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1024px)').matches,
  )
  const [isScrollActive, setIsScrollActive] = useState(false)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const handleViewportChange = (event: MediaQueryListEvent) => {
      setIsDesktopViewport(event.matches)
    }

    mediaQuery.addEventListener('change', handleViewportChange)
    return () => mediaQuery.removeEventListener('change', handleViewportChange)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      setIsScrollActive(true)
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
      scrollTimerRef.current = setTimeout(() => setIsScrollActive(false), 170)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    }
  }, [])

  const shouldShow = !isUserDashboard || isDesktopViewport
  const glassClass = isUserDashboard
    ? 'border-white/20'
    : 'border-white/35 bg-white/[0.10] supports-[backdrop-filter]:bg-white/[0.08]'
  const iconSize = isUserDashboard ? 22 : 24
  const transformY = isScrollActive ? -4 : 0

  if (typeof window === 'undefined' || !shouldShow) return null

  return (
    <Link
      href={supportHref}
      aria-label="Contact support"
      title="Contact support"
      className={`h-14 w-14 items-center justify-center rounded-full border text-white shadow-2xl backdrop-blur-xl transition hover:scale-105 ${glassClass} relative isolate overflow-hidden`}
      style={{
        position: 'fixed',
        right: 'max(16px, env(safe-area-inset-right, 0px))',
        bottom: 'max(16px, calc(env(safe-area-inset-bottom, 0px) + 8px))',
        zIndex: 26000,
        display: 'flex',
        background: isUserDashboard
          ? 'linear-gradient(135deg, rgba(88, 45, 255, 0.95), rgba(12, 116, 255, 0.92))'
          : 'linear-gradient(145deg, rgba(255,255,255,0.22), rgba(255,255,255,0.04) 44%, rgba(95, 70, 255, 0.36))',
        boxShadow: isUserDashboard
          ? '0 18px 36px rgba(0, 0, 0, 0.45)'
          : '0 18px 34px rgba(3, 8, 28, 0.55), 0 2px 0 rgba(255, 255, 255, 0.28) inset, 0 -10px 20px rgba(35, 45, 90, 0.25) inset',
        transform: isUserDashboard
          ? `translate3d(0, ${transformY}px, 0)`
          : `perspective(600px) translate3d(0, ${transformY}px, 0)`,
        willChange: 'transform',
      }}
    >
      {!isUserDashboard ? (
        <>
          <span
            className="pointer-events-none absolute inset-[1px] rounded-full"
            style={{
              border: '1px solid rgba(255,255,255,0.30)',
              background: 'linear-gradient(155deg, rgba(255,255,255,0.16), rgba(255,255,255,0.02) 54%, rgba(88,45,255,0.24))',
            }}
          />
          <span
            className="pointer-events-none absolute top-2 left-3 h-3.5 w-7 rounded-full"
            style={{
              background: 'rgba(255,255,255,0.46)',
              filter: 'blur(0.8px)',
            }}
          />
        </>
      ) : null}
      <MessageCircle
        size={iconSize}
        className="relative z-10"
        style={{
          filter: isUserDashboard
            ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.28))'
            : 'drop-shadow(0 3px 8px rgba(10, 16, 38, 0.65))',
        }}
      />
    </Link>
  )
}
