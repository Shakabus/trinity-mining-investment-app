'use client'

import { useEffect, useRef, useState } from 'react'
import DashboardNav from './DashboardNav'
import DashboardSidebar from './DashboardSidebar'
import UserPresenceTracker from './UserPresenceTracker'
import DashboardBottomNav from './DashboardBottomNav'
import { DashboardChromeProvider } from './DashboardChromeContext'
import MarketingWithdrawalAlert from '@/components/marketing/MarketingWithdrawalAlert'
import { CurrencyProvider } from '@/components/currency/CurrencyProvider'
import { LanguageProvider } from '@/components/i18n/LanguageProvider'
import LiveNotificationTicker from '@/components/notifications/LiveNotificationTicker'
import type { LanguageCode } from '@/lib/i18n'
import type { CurrencyCode, FxRates } from '@/lib/forex'

interface DashboardLayoutClientProps {
  children: React.ReactNode
  user: {
    email: string
    fullName: string | null
    accountStatus: string
  } | null
  accountStatusOverride?: string
  preferredLanguage: LanguageCode
  preferredCurrency: CurrencyCode
  rates: FxRates
}

export default function DashboardLayoutClient({
  children,
  user,
  accountStatusOverride,
  preferredLanguage,
  preferredCurrency,
  rates,
}: DashboardLayoutClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const [isTopChromeHidden, setIsTopChromeHidden] = useState(false)
  const mainScrollRef = useRef<HTMLElement | null>(null)
  const lastScrollTopRef = useRef(0)
  const scrollAnchorRef = useRef(0)
  const lastToggleAtRef = useRef(0)
  const isTopChromeHiddenRef = useRef(false)
  const displayUser = user
    ? { ...user, accountStatus: accountStatusOverride ?? user.accountStatus }
    : null

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1023px)')
    const applyViewport = (event?: MediaQueryListEvent) => {
      setIsMobileViewport(event ? event.matches : mediaQuery.matches)
    }

    applyViewport()
    mediaQuery.addEventListener('change', applyViewport)
    return () => mediaQuery.removeEventListener('change', applyViewport)
  }, [])

  useEffect(() => {
    isTopChromeHiddenRef.current = isTopChromeHidden
  }, [isTopChromeHidden])

  useEffect(() => {
    const scrollNode = mainScrollRef.current
    if (!scrollNode) return

    if (!isMobileViewport) {
      return
    }

    lastScrollTopRef.current = scrollNode.scrollTop
    scrollAnchorRef.current = scrollNode.scrollTop
    lastToggleAtRef.current = 0

    const onScroll = () => {
      const currentScrollTop = scrollNode.scrollTop
      const hidden = isTopChromeHiddenRef.current

      if (currentScrollTop <= 32) {
        if (hidden) {
          setIsTopChromeHidden(false)
          isTopChromeHiddenRef.current = false
        }
        scrollAnchorRef.current = currentScrollTop
        lastScrollTopRef.current = currentScrollTop
        return
      }

      const delta = currentScrollTop - lastScrollTopRef.current
      if (Math.abs(delta) < 4) {
        lastScrollTopRef.current = currentScrollTop
        return
      }

      const distanceFromAnchor = currentScrollTop - scrollAnchorRef.current
      const now = Date.now()
      const minToggleIntervalMs = 180
      const canToggle = now - lastToggleAtRef.current >= minToggleIntervalMs

      if (!hidden && distanceFromAnchor >= 56 && canToggle) {
        setIsTopChromeHidden(true)
        isTopChromeHiddenRef.current = true
        scrollAnchorRef.current = currentScrollTop
        lastToggleAtRef.current = now
      } else if (hidden && distanceFromAnchor <= -36 && canToggle) {
        setIsTopChromeHidden(false)
        isTopChromeHiddenRef.current = false
        scrollAnchorRef.current = currentScrollTop
        lastToggleAtRef.current = now
      }

      lastScrollTopRef.current = currentScrollTop
    }

    scrollNode.addEventListener('scroll', onScroll, { passive: true })
    return () => scrollNode.removeEventListener('scroll', onScroll)
  }, [isMobileViewport])

  const shouldHideTopChrome = isMobileViewport && isTopChromeHidden

  return (
    <CurrencyProvider currency={preferredCurrency} rates={rates}>
      <LanguageProvider language={preferredLanguage}>
      <DashboardChromeProvider hidden={shouldHideTopChrome}>
      <div
        className="h-screen overflow-hidden"
        style={{ background: '#000000' }}
      >
        <UserPresenceTracker />
        <MarketingWithdrawalAlert
          title="Live activity"
          minIntervalMs={2000}
          maxIntervalMs={4000}
          initialMinDelayMs={2000}
          initialMaxDelayMs={4000}
        />
        <div className="h-full flex">
          {/* Sidebar */}
          <DashboardSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

          {/* Main Column */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div
              className={`overflow-hidden transition-all duration-300 ${
                shouldHideTopChrome
                  ? 'max-h-0 -translate-y-6 opacity-0 pointer-events-none'
                  : 'max-h-44 translate-y-0 opacity-100'
              }`}
            >
              <DashboardNav user={displayUser} onMenuClick={() => setIsSidebarOpen(true)} />
              <LiveNotificationTicker
                endpoint="/api/user/notifications/ticker"
                label="Financial news"
                emptyText="Financial news feed is unavailable."
                pollIntervalMs={30000}
              />
            </div>

            {/* Scroll Container: ONLY this scrolls (NO padding here) */}
            <main ref={mainScrollRef} className="flex-1 min-h-0 overflow-y-auto glass-scroll pb-24 lg:pb-0">
              {children}
            </main>
          </div>
        </div>
        <DashboardBottomNav visible={shouldHideTopChrome} />
      </div>
      </DashboardChromeProvider>
      </LanguageProvider>
    </CurrencyProvider>
  )
}
