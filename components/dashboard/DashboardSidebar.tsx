'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Gem,
  Package,
  Pickaxe,
  DollarSign,
  Settings,
  History,
  Link2,
  X,
  ChevronsLeft,
  ChevronsRight,
  LifeBuoy,
  LineChart,
  Wallet,
  Layers,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

const menuItems = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Plans', href: '/dashboard/plans', icon: Gem },
  { name: 'My Plan', href: '/dashboard/my-plan', icon: Package },
  { name: 'Mining', href: '/dashboard/mining', icon: Pickaxe },
  { name: 'Earnings', href: '/dashboard/earnings', icon: DollarSign },
  {
    name: 'Investment Trading',
    href: '/dashboard/investment-trading',
    icon: Layers,
    children: [
      { name: 'Plans', href: '/dashboard/investment-trading#plans', icon: Package },
      { name: 'Portfolio Activity', href: '/dashboard/investment-trading/bot', icon: LineChart },
      { name: 'Earnings', href: '/dashboard/investment-trading/earnings', icon: LineChart },
      { name: 'Withdrawals', href: '/dashboard/investment-trading/withdrawals', icon: Wallet },
    ],
  },
  { name: 'Referrals', href: '/dashboard/referrals', icon: Link2 },
  { name: 'Activity', href: '/dashboard/activity', icon: History },
  { name: 'Support', href: '/dashboard/support', icon: LifeBuoy },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

interface DashboardSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function DashboardSidebar({ isOpen, onClose }: DashboardSidebarProps) {
  const pathname = usePathname()
  const [hash, setHash] = useState('')
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('dashboard_sidebar_collapsed') === 'true'
  })
  const [isTradingOpen, setIsTradingOpen] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const updateHash = () => setHash(window.location.hash || '')
    updateHash()
    window.addEventListener('hashchange', updateHash)
    return () => window.removeEventListener('hashchange', updateHash)
  }, [pathname])

  useEffect(() => {
    if (pathname?.startsWith('/dashboard/investment-trading')) {
      setIsTradingOpen(true)
    }
  }, [pathname])

  const toggleCollapsed = () => {
    setIsCollapsed(prev => {
      const next = !prev
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('dashboard_sidebar_collapsed', String(next))
      }
      return next
    })
  }

  return (
    <>
      {/* Overlay (Mobile & Tablet) */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Desktop Sidebar - Sticky + Full Height */}
      <aside
        className={`hidden lg:flex ${isCollapsed ? 'w-20' : 'w-[272px]'} h-screen sticky top-0 border-r p-4 flex-col overflow-y-auto glass-scroll transition-all duration-200`}
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          borderColor: 'rgba(255, 255, 255, 0.18)',
        }}
      >
        <div className={`flex ${isCollapsed ? 'justify-center' : 'justify-end'} mb-3`}>
          <button
            onClick={toggleCollapsed}
            className="p-2 rounded-xl transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, rgba(88, 45, 255, 0.35), rgba(58, 19, 122, 0.25))',
              border: '1px solid rgba(88, 45, 255, 0.5)',
            }}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronsRight size={16} className="text-white" /> : <ChevronsLeft size={16} className="text-white" />}
          </button>
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname?.startsWith(item.href))

            const Icon = item.icon

            if ('children' in item) {
              return (
                <div key={item.href} className="space-y-1">
                  <div
                    className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-3 rounded-lg transition-all group`}
                    style={{
                      background: isActive
                        ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05))'
                        : 'transparent',
                      color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                      border: isActive ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid transparent',
                    }}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <Link
                      href={item.href}
                      className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} flex-1`}
                    >
                      <div
                        className="p-1.5 rounded-lg transition-all transform group-hover:-translate-y-0.5"
                        style={{
                          background: isActive
                            ? 'linear-gradient(135deg, rgba(88, 45, 255, 0.3), rgba(58, 19, 122, 0.2))'
                            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02))',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        <Icon size={18} strokeWidth={2} />
                      </div>
                      {!isCollapsed && <span className="font-medium">{item.name}</span>}
                    </Link>
                    {!isCollapsed && (
                      <button
                        type="button"
                        onClick={() => setIsTradingOpen(prev => !prev)}
                        className="ml-auto p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        aria-label={isTradingOpen ? 'Collapse investment links' : 'Expand investment links'}
                      >
                        {isTradingOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    )}
                  </div>
                  {!isCollapsed && isTradingOpen && (
                    <div className="ml-10 space-y-1">
                      {item.children?.map(child => {
                        const childActive =
                          pathname === child.href ||
                          (child.href.includes('#') &&
                            pathname === '/dashboard/investment-trading' &&
                            hash === '#plans')
                        const ChildIcon = child.icon
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all"
                            style={{
                              background: childActive
                                ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04))'
                                : 'transparent',
                              color: childActive ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                              border: childActive ? '1px solid rgba(255, 255, 255, 0.18)' : '1px solid transparent',
                            }}
                          >
                            <div
                              className="p-1.5 rounded-lg"
                              style={{
                                background: childActive
                                  ? 'linear-gradient(135deg, rgba(88, 45, 255, 0.3), rgba(58, 19, 122, 0.2))'
                                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02))',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                              }}
                            >
                              <ChildIcon size={16} strokeWidth={2} />
                            </div>
                            <span className="font-medium">{child.name}</span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-3 rounded-lg transition-all group`}
                style={{
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05))'
                    : 'transparent',
                  color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                  border: isActive ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid transparent',
                }}
                title={isCollapsed ? item.name : undefined}
              >
                <div
                  className="p-1.5 rounded-lg transition-all transform group-hover:-translate-y-0.5"
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(88, 45, 255, 0.3), rgba(58, 19, 122, 0.2))'
                      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02))',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <Icon size={18} strokeWidth={2} />
                </div>
                {!isCollapsed && <span className="font-medium">{item.name}</span>}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Mobile/Tablet Slide-out Menu (unchanged) */}
      <aside
        className={`lg:hidden fixed top-0 left-0 h-full w-72 z-50 p-6 overflow-y-auto glass-scroll transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(28px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        {/* Close Button */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold text-white">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={24} className="text-white" />
          </button>
        </div>

        {/* Mobile Menu Items */}
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname?.startsWith(item.href))

            const Icon = item.icon

            if ('children' in item) {
              return (
                <div key={item.href} className="space-y-1">
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all"
                    style={{
                      background: isActive
                        ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05))'
                        : 'transparent',
                      color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                      border: isActive ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid transparent',
                    }}
                  >
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className="flex items-center gap-3 flex-1"
                    >
                      <div
                        className="p-1.5 rounded-lg transition-all"
                        style={{
                          background: isActive
                            ? 'linear-gradient(135deg, rgba(88, 45, 255, 0.3), rgba(58, 19, 122, 0.2))'
                            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02))',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        <Icon size={18} strokeWidth={2} />
                      </div>
                      <span className="font-medium">{item.name}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setIsTradingOpen(prev => !prev)}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                      aria-label={isTradingOpen ? 'Collapse investment links' : 'Expand investment links'}
                    >
                      {isTradingOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  </div>
                  {isTradingOpen && (
                    <div className="ml-10 space-y-1">
                      {item.children?.map(child => {
                        const childActive =
                          pathname === child.href ||
                          (child.href.includes('#') &&
                            pathname === '/dashboard/investment-trading' &&
                            hash === '#plans')
                      const ChildIcon = child.icon
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onClose}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all"
                          style={{
                            background: childActive
                              ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04))'
                              : 'transparent',
                            color: childActive ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                            border: childActive ? '1px solid rgba(255, 255, 255, 0.18)' : '1px solid transparent',
                          }}
                        >
                          <div
                            className="p-1.5 rounded-lg"
                            style={{
                              background: childActive
                                ? 'linear-gradient(135deg, rgba(88, 45, 255, 0.3), rgba(58, 19, 122, 0.2))'
                                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02))',
                              backdropFilter: 'blur(10px)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                            }}
                          >
                            <ChildIcon size={16} strokeWidth={2} />
                          </div>
                          <span className="font-medium">{child.name}</span>
                        </Link>
                      )
                    })}
                  </div>
                  )}
                </div>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all"
                style={{
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05))'
                    : 'transparent',
                  color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                  border: isActive ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid transparent',
                }}
              >
                <div
                  className="p-1.5 rounded-lg transition-all"
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(88, 45, 255, 0.3), rgba(58, 19, 122, 0.2))'
                      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02))',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <Icon size={18} strokeWidth={2} />
                </div>
                <span className="font-medium">{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
