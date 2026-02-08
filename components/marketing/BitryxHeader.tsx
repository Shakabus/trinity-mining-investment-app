'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { label: 'About Us', href: '/about-us' },
  { label: 'Features', href: '/#features' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Incentives', href: '/#incentives' },
]

export default function BitryxHeader() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const handleMobileNav = (href: string) => {
    setOpen(false)

    if (href.startsWith('/#') && pathname === '/') {
      const targetId = href.slice(2)
      window.setTimeout(() => {
        const el = document.getElementById(targetId)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          window.history.replaceState(null, '', href)
        }
      }, 120)
      return
    }

    router.push(href)
  }

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
            onClick={event => {
              event.preventDefault()
              handleMobileNav(item.href)
            }}
          >
            {item.label}
          </Link>
        ))}
        <Link
          className="bitryx-login-btn mobile"
          href="/sign-in"
          onClick={event => {
            event.preventDefault()
            handleMobileNav('/sign-in')
          }}
        >
          Login
        </Link>
      </div>
    </header>
  )
}
