'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentType } from 'react'
import {
  ArrowUpFromLine,
  DollarSign,
  Gem,
  LayoutDashboard,
  LifeBuoy,
  Pickaxe,
  Wallet,
} from 'lucide-react'

interface DashboardBottomNavProps {
  visible: boolean
}

interface DashboardBottomNavItem {
  href: string
  label: string
  icon: ComponentType<{ size?: number }>
  primary?: boolean
}

const navItems: DashboardBottomNavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/plans', label: 'Plans', icon: Gem },
  { href: '/dashboard/account/fund', label: 'Fund', icon: Wallet },
  { href: '/dashboard/mining', label: 'Mining', icon: Pickaxe, primary: true },
  { href: '/dashboard/account/withdraw', label: 'Withdraw', icon: ArrowUpFromLine },
  { href: '/dashboard/earnings', label: 'Earnings', icon: DollarSign },
  { href: '/dashboard/support', label: 'Support', icon: LifeBuoy },
]

function isItemActive(pathname: string | null, href: string) {
  if (!pathname) return false
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname.startsWith(href)
}

export default function DashboardBottomNav({ visible }: DashboardBottomNavProps) {
  const pathname = usePathname()

  return (
    <div
      className={`fixed bottom-4 left-1/2 z-40 w-[min(94vw,720px)] -translate-x-1/2 transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'
      }`}
    >
      <nav
        className="rounded-full px-2 py-2"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.78), rgba(30, 41, 59, 0.62))',
          border: '1px solid rgba(148, 163, 184, 0.35)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 14px 34px rgba(2, 6, 23, 0.5)',
        }}
      >
        <ul className="grid grid-cols-7 items-end gap-1">
          {navItems.map(item => {
            const isActive = isItemActive(pathname, item.href)
            const Icon = item.icon
            const isPrimary = Boolean(item.primary)

            if (isPrimary) {
              return (
                <li key={item.href} className="flex justify-center">
                  <Link
                    href={item.href}
                    className="flex h-14 w-14 -translate-y-3 items-center justify-center rounded-full text-white transition hover:scale-105"
                    style={{
                      background: isActive
                        ? 'linear-gradient(135deg, #10b981, #047857)'
                        : 'linear-gradient(135deg, #582dff, #3a137a)',
                      border: '1px solid rgba(255, 255, 255, 0.35)',
                      boxShadow: '0 10px 24px rgba(88, 45, 255, 0.45)',
                    }}
                    aria-label={item.label}
                    title={item.label}
                  >
                    <Icon size={20} />
                  </Link>
                </li>
              )
            }

            return (
              <li key={item.href} className="flex justify-center">
                <Link
                  href={item.href}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition hover:scale-105 hover:text-white"
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.45), rgba(29, 78, 216, 0.35))'
                      : 'linear-gradient(135deg, rgba(148, 163, 184, 0.18), rgba(148, 163, 184, 0.06))',
                    border: isActive
                      ? '1px solid rgba(191, 219, 254, 0.6)'
                      : '1px solid rgba(148, 163, 184, 0.3)',
                  }}
                  aria-label={item.label}
                  title={item.label}
                >
                  <Icon size={17} />
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
