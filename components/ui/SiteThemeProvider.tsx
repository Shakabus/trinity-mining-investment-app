'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

type SiteTheme = 'dark' | 'light'

type ThemeContextValue = {
  theme: SiteTheme
  setTheme: (value: SiteTheme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const THEME_STORAGE_KEY = 'trinity_site_theme'

function getInitialTheme(): SiteTheme {
  if (typeof window !== 'undefined') {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  }
  if (typeof document !== 'undefined') {
    const current = document.documentElement.dataset.theme
    if (current === 'light' || current === 'dark') return current
  }
  return 'dark'
}

export function SiteThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<SiteTheme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return
      if (event.newValue === 'dark' || event.newValue === 'light') {
        setThemeState(event.newValue)
      }
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: setThemeState,
      toggleTheme: () => setThemeState(prev => (prev === 'dark' ? 'light' : 'dark')),
    }),
    [theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useSiteTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useSiteTheme must be used inside SiteThemeProvider')
  }
  return context
}
