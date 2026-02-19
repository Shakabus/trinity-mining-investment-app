'use client'

import { useState } from 'react'
import DashboardNav from './DashboardNav'
import DashboardSidebar from './DashboardSidebar'
import UserPresenceTracker from './UserPresenceTracker'
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
  const displayUser = user
    ? { ...user, accountStatus: accountStatusOverride ?? user.accountStatus }
    : null

  return (
    <CurrencyProvider currency={preferredCurrency} rates={rates}>
      <LanguageProvider language={preferredLanguage}>
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
            {/* Top Navigation (sticky) */}
            <DashboardNav user={displayUser} onMenuClick={() => setIsSidebarOpen(true)} />
            <LiveNotificationTicker endpoint="/api/user/notifications/ticker" pollIntervalMs={30000} />

            {/* Scroll Container: ONLY this scrolls (NO padding here) */}
            <main className="flex-1 min-h-0 overflow-y-auto glass-scroll">
              {children}
            </main>
          </div>
        </div>
      </div>
      </LanguageProvider>
    </CurrencyProvider>
  )
}
