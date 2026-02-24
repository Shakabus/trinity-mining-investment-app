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
  const [isTopChromeHidden, setIsTopChromeHidden] = useState(false)
  const mainScrollRef = useRef<HTMLElement | null>(null)
  const lastScrollTopRef = useRef(0)
  const displayUser = user
    ? { ...user, accountStatus: accountStatusOverride ?? user.accountStatus }
    : null

  useEffect(() => {
    const scrollNode = mainScrollRef.current
    if (!scrollNode) return

    const onScroll = () => {
      const currentScrollTop = scrollNode.scrollTop
      const delta = currentScrollTop - lastScrollTopRef.current

      if (currentScrollTop <= 40) {
        setIsTopChromeHidden(false)
      } else if (Math.abs(delta) >= 8) {
        setIsTopChromeHidden(delta > 0)
      }

      lastScrollTopRef.current = currentScrollTop
    }

    scrollNode.addEventListener('scroll', onScroll, { passive: true })
    return () => scrollNode.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <CurrencyProvider currency={preferredCurrency} rates={rates}>
      <LanguageProvider language={preferredLanguage}>
      <DashboardChromeProvider hidden={isTopChromeHidden}>
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
                isTopChromeHidden
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
            <main ref={mainScrollRef} className="flex-1 min-h-0 overflow-y-auto glass-scroll pb-24">
              {children}
            </main>
          </div>
        </div>
        <DashboardBottomNav visible={isTopChromeHidden} />
      </div>
      </DashboardChromeProvider>
      </LanguageProvider>
    </CurrencyProvider>
  )
}
