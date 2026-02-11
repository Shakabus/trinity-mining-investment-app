'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import ThemeToggle from '@/components/ui/ThemeToggle'

const NAV_ITEMS = [
  { label: 'Features', href: '/features' },
  { label: 'Incentives', href: '/incentives' },
  { label: 'About Us', href: '/about-us' },
  { label: 'How It Works', href: '/how-it-works' },
]

export default function BitryxHeader() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    let frame = 0

    const applyScrollOffset = () => {
      frame = 0
      if (root.dataset.theme === 'light') {
        root.style.setProperty('--marketing-scroll-y', `${window.scrollY}px`)
      } else {
        root.style.setProperty('--marketing-scroll-y', '0px')
      }
    }

    const queueApply = () => {
      if (frame) return
      frame = window.requestAnimationFrame(applyScrollOffset)
    }

    const observer = new MutationObserver(queueApply)
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] })

    queueApply()
    window.addEventListener('scroll', queueApply, { passive: true })
    window.addEventListener('resize', queueApply)

    return () => {
      observer.disconnect()
      if (frame) {
        window.cancelAnimationFrame(frame)
      }
      window.removeEventListener('scroll', queueApply)
      window.removeEventListener('resize', queueApply)
      root.style.setProperty('--marketing-scroll-y', '0px')
    }
  }, [])

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

      <div className="bitryx-theme-toggle" aria-label="Theme mode toggle">
        <ThemeToggle compact />
      </div>
    </header>
  )
}
