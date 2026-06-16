'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Check, Globe2 } from 'lucide-react'
import ThemeToggle from '@/components/ui/ThemeToggle'
import MarketingLiveTape from '@/components/marketing/MarketingLiveTape'
import MarketingWithdrawalAlert from '@/components/marketing/MarketingWithdrawalAlert'
import DashboardAutoTranslate from '@/components/i18n/DashboardAutoTranslate'
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES, type LanguageCode, isSupportedLanguage } from '@/lib/i18n'
import {
  readPreferredLanguage,
  subscribePreferredLanguage,
  syncPreferredLanguage,
} from '@/lib/language-preference'

const NAV_ITEMS = [
  { label: 'Features', href: '/features' },
  { label: 'Incentives', href: '/incentives' },
  { label: 'About Us', href: '/about-us' },
  { label: 'How It Works', href: '/how-it-works' },
]

export default function BitryxHeader() {
  const [open, setOpen] = useState(false)
  const [language, setLanguage] = useState<LanguageCode>(() => {
    return readPreferredLanguage('en')
  })
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false)
  const languageMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    syncPreferredLanguage(language)
  }, [language])

  useEffect(() => {
    return subscribePreferredLanguage(nextLanguage => {
      if (isSupportedLanguage(nextLanguage)) {
        setLanguage(previous => (previous === nextLanguage ? previous : nextLanguage))
      }
    })
  }, [])

  useEffect(() => {
    if (!languageMenuOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
        setLanguageMenuOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [languageMenuOpen])

  return (
    <>
      <DashboardAutoTranslate language={language} remoteEnabled />
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
          </nav>

          <div className="bitryx-controls">
            <div
              ref={languageMenuRef}
              className="bitryx-lang-wrapper"
              data-no-auto-translate="true"
            >
              <button
                className="bitryx-lang-toggle"
                aria-label="Change language"
                onClick={() => setLanguageMenuOpen(prev => !prev)}
                type="button"
                title={`Language: ${LANGUAGE_LABELS[language]}`}
              >
                <Globe2 size={16} />
              </button>
              {languageMenuOpen && (
                <div className="bitryx-lang-menu">
                  {SUPPORTED_LANGUAGES.map(code => (
                    <button
                      key={code}
                      className="bitryx-lang-item"
                      onClick={() => {
                        setLanguage(code)
                        setLanguageMenuOpen(false)
                      }}
                      type="button"
                    >
                      <span>{LANGUAGE_LABELS[code]}</span>
                      {code === language ? <Check size={13} /> : null}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Link className="bitryx-login-btn bitryx-login-desktop" href="/sign-in">
              Login
            </Link>
            <button
              className="bitryx-toggle"
              aria-label="Toggle menu"
              aria-expanded={open}
              onClick={() => {
                setLanguageMenuOpen(false)
                setOpen(prev => !prev)
              }}
              type="button"
            >
              <span />
              <span />
            </button>
          </div>
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
