'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LayoutDashboard, Gem, Package, Pickaxe, DollarSign, Settings, History, Link2, X, ChevronsLeft, ChevronsRight, LifeBuoy } from 'lucide-react'

const menuItems = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Plans', href: '/dashboard/plans', icon: Gem },
  { name: 'My Plan', href: '/dashboard/my-plan', icon: Package },
  { name: 'Mining', href: '/dashboard/mining', icon: Pickaxe },
  { name: 'Earnings', href: '/dashboard/earnings', icon: DollarSign },
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
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('dashboard_sidebar_collapsed') : null
    if (stored === 'true') {
      setIsCollapsed(true)
    }
  }, [])

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
        className={`lg:hidden fixed top-0 left-0 h-full w-72 z-50 p-6 transform transition-transform duration-300 ease-in-out ${
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
