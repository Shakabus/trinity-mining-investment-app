'use client'

import Link from 'next/link'
import { useState } from 'react'
import ThemeToggle from '@/components/ui/ThemeToggle'
import MarketingLiveTape from '@/components/marketing/MarketingLiveTape'
import MarketingWithdrawalAlert from '@/components/marketing/MarketingWithdrawalAlert'

const NAV_ITEMS = [
  { label: 'Features', href: '/features' },
  { label: 'Incentives', href: '/incentives' },
  { label: 'About Us', href: '/about-us' },
  { label: 'How It Works', href: '/how-it-works' },
]

export default function BitryxHeader() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <MarketingLiveTape />
      <MarketingWithdrawalAlert
        minIntervalMs={2000}
        maxIntervalMs={4000}
        initialMinDelayMs={2000}
        initialMaxDelayMs={4000}
      />
      <header className={`bitryx-header${open ? ' active' : ''}`}>
        <div className="bitryx-container">
          <div className="bitryx-logo">
            <Link href="/">Trinity</Link>
          </div>

          <nav className="bitryx-nav">
            {NAV_ITEMS.map(item => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
            <Link className="bitryx-login-btn" href="/sign-in">
              Login
            </Link>
          </nav>

          <button
            className="bitryx-toggle"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen(prev => !prev)}
            type="button"
          >
            <span />
            <span />
          </button>
        </div>

        <div className="bitryx-mobile-menu">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <Link
            className="bitryx-login-btn mobile"
            href="/sign-in"
            onClick={() => setOpen(false)}
          >
            Login
          </Link>
        </div>

        <div className="bitryx-theme-toggle" aria-label="Theme mode toggle">
          <ThemeToggle compact />
        </div>
      </header>
    </>
  )
}
