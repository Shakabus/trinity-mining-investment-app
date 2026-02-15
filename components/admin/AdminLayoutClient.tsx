'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { Users, CreditCard, LifeBuoy, Menu, X, LayoutDashboard, Banknote, Link2, Building2, ChevronsLeft, ChevronsRight, Radio } from 'lucide-react'
import ThemeToggle from '@/components/ui/ThemeToggle'

const menuItems = [
  { name: 'Overview', href: '/admin', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Payments', href: '/admin/payments', icon: CreditCard },
  { name: 'Withdrawals', href: '/admin/withdrawals', icon: Banknote },
  { name: 'Properties', href: '/admin/real-estate', icon: Building2 },
  { name: 'Referrals', href: '/admin/referrals', icon: Link2 },
  { name: 'Support', href: '/admin/settings', icon: LifeBuoy },
]

interface AdminLayoutClientProps {
  children: React.ReactNode
  user: {
    email: string
    fullName: string | null
  }
}

export default function AdminLayoutClient({ children, user }: AdminLayoutClientProps) {
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('admin_sidebar_collapsed') === 'true'
  })

  const toggleCollapsed = () => {
    setIsCollapsed(prev => {
      const next = !prev
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('admin_sidebar_collapsed', String(next))
      }
      return next
    })
  }

  return (
    <div
      className="h-screen overflow-hidden"
      style={{ background: '#000000' }}
    >
      <div className="h-full flex flex-col">
        {/* Top Navigation (sticky, not scrolling) */}
        <nav
          className="border-b sticky top-0 left-0 right-0 z-30"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            borderColor: 'rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="px-4 md:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <Menu size={20} className="text-white" />
              </button>

              <Link href="/admin" className="flex items-center gap-2">
                <div className="text-lg md:text-2xl font-bold text-white">Admin Panel</div>
              </Link>
            </div>

	            <div className="flex items-center gap-3 md:gap-6">
	              <div className="hidden md:block text-right">
	                <div className="text-sm font-medium text-white">{user.fullName || 'Admin'}</div>
	                <div className="text-xs text-white/60">{user.email}</div>
	              </div>

	              <ThemeToggle compact />

	              <UserButton
                appearance={{
                  elements: {
                    avatarBox: 'w-8 h-8 md:w-10 md:h-10',
                    userButtonPopoverCard: {
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    },
                    userButtonPopoverActionButton: {
                      color: '#1f2937',
                    },
                  },
                }}
              />
            </div>
          </div>
        </nav>

        <div className="flex flex-1 min-h-0">
          {/* Overlay */}
          {isSidebarOpen && (
            <div
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Desktop Sidebar (sticky, not scrolling) */}
          <aside
            className={`hidden lg:flex ${isCollapsed ? 'w-20' : 'w-[272px]'} h-full border-r p-4 flex-col sticky top-0 glass-scroll transition-all duration-200`}
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
                const isActive = pathname === item.href
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

            {!isCollapsed && (
              <div className="mt-auto pt-6">
                <Link
                  href="/live-payments"
                  className="mb-2 flex items-center gap-2 px-4 py-2 rounded-lg text-emerald-200 hover:text-emerald-100 hover:bg-emerald-500/10 transition-all text-sm border border-emerald-400/30"
                >
                  <Radio size={14} />
                  Live Payment Stream
                </Link>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-all text-sm"
                >
                  &larr; Back to Dashboard
                </Link>
              </div>
            )}
          </aside>

          {/* Mobile Sidebar (unchanged behavior) */}
          <aside
            className={`lg:hidden fixed top-0 left-0 h-full w-72 z-50 p-6 overflow-y-auto glass-scroll transform transition-transform duration-300 ease-in-out ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
              backdropFilter: 'blur(28px)',
              borderRight: '1px solid rgba(255, 255, 255, 0.18)',
            }}
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold text-white">Menu</h2>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={24} className="text-white" />
              </button>
            </div>

            <nav className="space-y-2">
              {menuItems.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsSidebarOpen(false)}
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
                      className="p-1.5 rounded-lg"
                      style={{
                        background: isActive
                          ? 'linear-gradient(135deg, rgba(88, 45, 255, 0.3), rgba(58, 19, 122, 0.2))'
                          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02))',
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

            <div className="mt-4 border-t border-white/10 pt-4">
              <Link
                href="/live-payments"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-emerald-200 hover:bg-emerald-500/10 transition-all text-sm border border-emerald-400/30"
              >
                <Radio size={14} />
                Live Payment Stream
              </Link>
            </div>
          </aside>

          {/* Main Content (ONLY scrolling area) */}
          <main className="flex-1 min-w-0 min-h-0 overflow-y-auto glass-scroll p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

