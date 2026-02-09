'use client'

import Link from 'next/link'
import { useState } from 'react'

const NAV_ITEMS = [
  { label: 'Features', href: '/#features' },
  { label: 'Incentives', href: '/#incentives' },
  { label: 'About Us', href: '/about-us' },
  { label: 'How It Works', href: '/how-it-works' },
]

export default function BitryxHeader() {
  const [open, setOpen] = useState(false)

  return (
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
    </header>
  )
}
