'use client'

import { Moon, Sun } from 'lucide-react'
import { useSiteTheme } from '@/components/ui/SiteThemeProvider'

type ThemeToggleProps = {
  compact?: boolean
  className?: string
}

export default function ThemeToggle({ compact = false, className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useSiteTheme()
  const isLight = theme === 'light'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      className={`theme-toggle ${compact ? 'theme-toggle-compact' : ''} ${className}`.trim()}
    >
      <span className={`theme-toggle-track ${isLight ? 'is-light' : 'is-dark'}`}>
        <span className="theme-toggle-icon">
          {isLight ? <Sun size={14} strokeWidth={2.3} /> : <Moon size={14} strokeWidth={2.3} />}
        </span>
        {!compact && <span className="theme-toggle-label">{isLight ? 'Light' : 'Dark'}</span>}
      </span>
    </button>
  )
}

