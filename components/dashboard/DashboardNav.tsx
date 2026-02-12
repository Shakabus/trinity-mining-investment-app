'use client'

import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Menu } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import ThemeToggle from '@/components/ui/ThemeToggle'

interface DashboardNavProps {
  user: {
    email: string
    fullName: string | null
    accountStatus: string
  } | null
  onMenuClick?: () => void
}

const ACTIVITY_SEEN_KEY_PREFIX = 'dashboard_activity_seen_id:'

function getSeenActivityId(storageKey: string) {
  if (typeof window === 'undefined') return 0
  const rawValue = window.localStorage.getItem(storageKey)
  const numericValue = Number(rawValue)
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 0
}

function markActivityAsSeen(storageKey: string, latestActivityId: number) {
  if (typeof window === 'undefined' || latestActivityId <= 0) return
  window.localStorage.setItem(storageKey, String(latestActivityId))
}

export default function DashboardNav({ user, onMenuClick }: DashboardNavProps) {
  const [isMounted] = useState(true)
  const [latestActivityId, setLatestActivityId] = useState(0)
  const { t } = useLanguage()
  const pathname = usePathname()
  const statusKey = user?.accountStatus === 'active' ? 'active' : user?.accountStatus === 'pending' ? 'pending' : 'inactive'
  const activityStorageKey = user?.email
    ? `${ACTIVITY_SEEN_KEY_PREFIX}${user.email.toLowerCase()}`
    : null

  useEffect(() => {
    if (!user?.email) return

    let cancelled = false

    const loadActivityMeta = async () => {
      try {
        const response = await fetch('/api/user/activity/meta', { cache: 'no-store' })
        if (!response.ok) return

        const data = (await response.json()) as { latestActivityId?: number | null }
        const parsedActivityId = Number(data.latestActivityId ?? 0)

        if (!cancelled && Number.isFinite(parsedActivityId)) {
          setLatestActivityId(parsedActivityId > 0 ? parsedActivityId : 0)
        }
      } catch {
        // Silent failure keeps the nav usable when polling fails.
      }
    }

    void loadActivityMeta()
    const intervalId = window.setInterval(loadActivityMeta, 30000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [user?.email])

  useEffect(() => {
    if (!activityStorageKey) return
    if (!pathname.startsWith('/dashboard/activity')) return
    if (latestActivityId <= 0) return

    markActivityAsSeen(activityStorageKey, latestActivityId)
  }, [activityStorageKey, latestActivityId, pathname])

  const hasUnreadActivity = useMemo(() => {
    if (!activityStorageKey) return false
    if (pathname.startsWith('/dashboard/activity')) return false
    if (latestActivityId <= 0) return false

    return latestActivityId > getSeenActivityId(activityStorageKey)
  }, [activityStorageKey, latestActivityId, pathname])

  return (
    <nav
      className="border-b sticky top-0 z-30 w-full"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
        backdropFilter: 'blur(20px)',
        borderColor: 'rgba(255, 255, 255, 0.18)',
      }}
    >
      <div className="px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Menu size={20} className="text-white" />
          </button>

          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-tight whitespace-nowrap">
              Trinity
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3 md:gap-6">
          <div className="hidden md:flex items-center gap-2">
            <span className="text-sm text-white/70">{t('status')}:</span>
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background:
                  user?.accountStatus === 'active'
                    ? 'rgba(34, 197, 94, 0.2)'
                    : user?.accountStatus === 'pending'
                    ? 'rgba(234, 179, 8, 0.2)'
                    : 'rgba(239, 68, 68, 0.2)',
                color:
                  user?.accountStatus === 'active'
                    ? '#86efac'
                    : user?.accountStatus === 'pending'
                    ? '#fde047'
                    : '#fca5a5',
                border: '1px solid',
                borderColor:
                  user?.accountStatus === 'active'
                    ? 'rgba(34, 197, 94, 0.3)'
                    : user?.accountStatus === 'pending'
                    ? 'rgba(234, 179, 8, 0.3)'
                    : 'rgba(239, 68, 68, 0.3)',
              }}
            >
              {t(statusKey).toUpperCase()}
            </span>
          </div>

          <div className="hidden md:block text-right">
            <div className="text-sm font-medium text-white">
              {user?.fullName || 'User'}
            </div>
            <div className="text-xs text-white/60">
              {user?.email}
            </div>
          </div>

          <Link
            href="/dashboard/activity"
            onClick={() => {
              if (activityStorageKey && latestActivityId > 0) {
                markActivityAsSeen(activityStorageKey, latestActivityId)
              }
            }}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 md:h-10 md:w-10"
            aria-label="Open activity"
            title="Open activity"
          >
            <Bell size={18} />
            {hasUnreadActivity ? (
              <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
              </span>
            ) : null}
          </Link>

          <ThemeToggle compact />
          {isMounted ? (
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'w-8 h-8 md:w-10 md:h-10',
                  userButtonPopoverCard:
                    'bg-white/75 text-gray-900 border border-white/45 shadow-2xl backdrop-blur-xl supports-[backdrop-filter]:bg-white/70',
                  userButtonPopoverMain: 'bg-transparent',
                  userButtonPopoverActionButton: 'text-gray-800 hover:bg-white/60',
                  userButtonPopoverActionButtonText: 'text-gray-800',
                  userButtonPopoverActionButtonIcon: 'text-gray-500',
                  userButtonPopoverUserPreviewMainIdentifier: 'text-gray-900',
                  userButtonPopoverUserPreviewSecondaryIdentifier: 'text-gray-700',
                  userButtonPopoverFooter: 'hidden',
                },
              }}
            />
          ) : (
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10" />
          )}
        </div>
      </div>
    </nav>
  )
}
