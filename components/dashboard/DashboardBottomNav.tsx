'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, useState, type ComponentType } from 'react'
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
  const [swipeIndex, setSwipeIndex] = useState<number | null>(null)
  const navListRef = useRef<HTMLUListElement | null>(null)

  const resolveSwipeIndex = (clientX: number) => {
    const list = navListRef.current
    if (!list) return null
    const bounds = list.getBoundingClientRect()
    if (clientX < bounds.left || clientX > bounds.right) return null
    const relative = (clientX - bounds.left) / bounds.width
    const rawIndex = Math.floor(relative * navItems.length)
    return Math.max(0, Math.min(navItems.length - 1, rawIndex))
  }

  return (
    <div
      className={`fixed bottom-2 left-0 right-0 z-40 transition-all duration-300 lg:hidden ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'
      }`}
    >
      <div className="mx-auto w-full max-w-[520px] px-2 pb-[max(env(safe-area-inset-bottom),0px)]">
        <nav
          className="rounded-t-3xl border-x border-t px-2.5 py-2"
          style={{
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.74))',
            borderColor: 'rgba(148, 163, 184, 0.32)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 -10px 28px rgba(2, 6, 23, 0.45)',
          }}
        >
          <ul
            ref={navListRef}
            className="grid grid-cols-5 items-end gap-1"
            onTouchStart={event => {
              const index = resolveSwipeIndex(event.touches[0].clientX)
              setSwipeIndex(index)
            }}
            onTouchMove={event => {
              const index = resolveSwipeIndex(event.touches[0].clientX)
              setSwipeIndex(index)
            }}
            onTouchEnd={() => setSwipeIndex(null)}
            onTouchCancel={() => setSwipeIndex(null)}
          >
            {navItems.map((item, index) => {
            const isActive = isItemActive(pathname, item.href)
            const Icon = item.icon
            const isPrimary = Boolean(item.primary)
            const isSwipeActive = swipeIndex === index
            const isHighlighted = swipeIndex === null ? isActive : isSwipeActive

            if (isPrimary) {
              return (
                <li key={item.href} className="flex justify-center">
                  <Link
                    href={item.href}
                    className={`flex h-14 w-14 items-center justify-center rounded-full text-white transition duration-200 active:scale-110 ${
                      isHighlighted ? '-translate-y-1.5 scale-110' : 'scale-100'
                    }`}
                    style={{
                      background: isHighlighted
                        ? 'linear-gradient(135deg, #582dff, #3a137a)'
                        : 'linear-gradient(135deg, rgba(148, 163, 184, 0.18), rgba(148, 163, 184, 0.06))',
                      border: isHighlighted
                        ? '1px solid rgba(196, 181, 253, 0.85)'
                        : '1px solid rgba(148, 163, 184, 0.3)',
                      boxShadow: isHighlighted ? '0 10px 24px rgba(88, 45, 255, 0.45)' : 'none',
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
                  className={`flex h-[50px] w-[50px] items-center justify-center rounded-full text-white/85 transition duration-200 active:scale-110 ${
                    isHighlighted ? '-translate-y-1 scale-[1.12] text-white' : 'scale-100'
                  }`}
                  style={{
                    background: isHighlighted
                      ? 'linear-gradient(135deg, rgba(88, 45, 255, 0.95), rgba(58, 19, 122, 0.9))'
                      : 'linear-gradient(135deg, rgba(148, 163, 184, 0.18), rgba(148, 163, 184, 0.06))',
                    border: isHighlighted
                      ? '1px solid rgba(196, 181, 253, 0.85)'
                      : '1px solid rgba(148, 163, 184, 0.3)',
                    boxShadow: isHighlighted ? '0 10px 20px rgba(88, 45, 255, 0.35)' : 'none',
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
    </div>
  )
}
