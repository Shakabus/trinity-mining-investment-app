'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentType } from 'react'
import {
  Building2,
  Home,
  MessageCircle,
  Pickaxe,
  TrendingUp,
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
  { href: '/dashboard/real-estate', label: 'Real Estate', icon: Building2 },
  { href: '/dashboard/mining', label: 'Mining', icon: Pickaxe },
  { href: '/dashboard', label: 'Home', icon: Home, primary: true },
  { href: '/dashboard/investment-trading', label: 'Trading', icon: TrendingUp },
  { href: '/dashboard/support', label: 'Support', icon: MessageCircle },
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
      className={`fixed bottom-4 left-1/2 z-40 w-[min(92vw,420px)] -translate-x-1/2 transition-all duration-300 lg:hidden ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'
      }`}
    >
      <nav
        className="rounded-full px-2.5 py-1.5"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.78), rgba(30, 41, 59, 0.62))',
          border: '1px solid rgba(148, 163, 184, 0.35)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 14px 34px rgba(2, 6, 23, 0.5)',
        }}
      >
        <ul className="grid grid-cols-5 items-center gap-1.5">
          {navItems.map(item => {
            const isActive = isItemActive(pathname, item.href)
            const Icon = item.icon
            const isPrimary = Boolean(item.primary)

            if (isPrimary) {
              return (
                <li key={item.href} className="flex justify-center">
                  <Link
                    href={item.href}
                    className={`flex h-14 w-14 items-center justify-center rounded-full text-white transition duration-200 active:scale-110 ${
                      isActive ? '-translate-y-1.5 scale-110' : 'scale-100'
                    }`}
                    style={{
                      background: 'linear-gradient(135deg, #582dff, #3a137a)',
                      border: '1px solid rgba(255, 255, 255, 0.35)',
                      boxShadow: '0 10px 24px rgba(88, 45, 255, 0.45)',
                    }}
                    aria-label={item.label}
                    title={item.label}
                  >
                    <Icon size={24} />
                  </Link>
                </li>
              )
            }

            return (
              <li key={item.href} className="flex justify-center">
                <Link
                  href={item.href}
                  className={`flex h-[52px] w-[52px] items-center justify-center rounded-full text-white/85 transition duration-200 active:scale-110 ${
                    isActive ? '-translate-y-0.5 scale-110 text-white' : 'scale-100'
                  }`}
                  style={{
                    background: 'linear-gradient(135deg, rgba(148, 163, 184, 0.18), rgba(148, 163, 184, 0.06))',
                    border: isActive
                      ? '1px solid rgba(226, 232, 240, 0.7)'
                      : '1px solid rgba(148, 163, 184, 0.3)',
                  }}
                  aria-label={item.label}
                  title={item.label}
                >
                  <Icon size={22} />
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
