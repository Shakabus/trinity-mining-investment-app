'use client'

import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { Menu } from 'lucide-react'
import { useState } from 'react'
import { useLanguage } from '@/components/i18n/LanguageProvider'

interface DashboardNavProps {
  user: {
    email: string
    fullName: string | null
    accountStatus: string
  } | null
  onMenuClick?: () => void
}

export default function DashboardNav({ user, onMenuClick }: DashboardNavProps) {
  const [isMounted] = useState(true)
  const { t } = useLanguage()
  const statusKey = user?.accountStatus === 'active' ? 'active' : user?.accountStatus === 'pending' ? 'pending' : 'inactive'

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
        {/* Left side - Menu button + Logo */}
        <div className="flex items-center gap-3">
          {/* Mobile Menu Button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Menu size={20} className="text-white" />
          </button>

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-tight whitespace-nowrap">
              Trinity
            </div>
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 md:gap-6">
          {/* Account Status Badge */}
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

          {/* User Info - Hidden on Mobile */}
          <div className="hidden md:block text-right">
            <div className="text-sm font-medium text-white">
              {user?.fullName || 'User'}
            </div>
            <div className="text-xs text-white/60">
              {user?.email}
            </div>
          </div>

          {/* Clerk User Button */}
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
