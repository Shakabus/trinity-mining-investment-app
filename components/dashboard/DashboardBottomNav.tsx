'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentType } from 'react'
import {
  ArrowUpFromLine,
  Gem,
  LayoutDashboard,
  LifeBuoy,
  Pickaxe,
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
  { href: '/dashboard/mining', label: 'Mining', icon: Pickaxe, primary: true },
  { href: '/dashboard/account/withdraw', label: 'Withdraw', icon: ArrowUpFromLine },
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
      className={`fixed bottom-4 left-1/2 z-40 w-[min(94vw,560px)] -translate-x-1/2 transition-all duration-300 lg:hidden ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'
      }`}
    >
      <nav
        className="overflow-x-auto rounded-full px-2 py-2 no-scrollbar"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.78), rgba(30, 41, 59, 0.62))',
          border: '1px solid rgba(148, 163, 184, 0.35)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 14px 34px rgba(2, 6, 23, 0.5)',
        }}
      >
        <ul className="mx-auto flex min-w-max items-end gap-2 px-1">
          {navItems.map(item => {
            const isActive = isItemActive(pathname, item.href)
            const Icon = item.icon
            const isPrimary = Boolean(item.primary)

            if (isPrimary) {
              return (
                <li key={item.href} className="flex justify-center">
                  <Link
                    href={item.href}
                    className={`flex h-16 w-16 items-center justify-center rounded-full text-white transition duration-200 active:scale-110 ${
                      isActive ? '-translate-y-2 scale-105' : '-translate-y-1'
                    }`}
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
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-white/85 transition duration-200 active:scale-110 ${
                    isActive ? '-translate-y-1 scale-105 text-white' : 'scale-100'
                  }`}
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
                  <Icon size={19} />
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
