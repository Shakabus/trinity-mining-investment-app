'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useLanguage } from '@/components/i18n/LanguageProvider'
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
  Building2,
  Home,
  Radio,
  ShieldCheck,
} from 'lucide-react'

const menuItems = [
  { name: 'Overview', labelKey: 'overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Cloud Mining Plans', href: '/dashboard/plans', icon: Gem },
  { name: 'My Plan', labelKey: 'myPlan', href: '/dashboard/my-plan', icon: Package },
  { name: 'Mining', labelKey: 'mining', href: '/dashboard/mining', icon: Pickaxe },
  { name: 'Earnings', labelKey: 'earnings', href: '/dashboard/earnings', icon: DollarSign },
  {
    name: 'Promotional Trading Plans',
    href: '/dashboard/investment-trading',
    icon: Layers,
    children: [
      { name: 'Plans', labelKey: 'plans', href: '/dashboard/investment-trading#plans', icon: Package },
      { name: 'Portfolio Activity', labelKey: 'portfolioActivity', href: '/dashboard/investment-trading/bot', icon: LineChart },
      { name: 'Earnings', labelKey: 'earnings', href: '/dashboard/investment-trading/earnings', icon: LineChart },
      { name: 'Withdrawals', labelKey: 'withdrawals', href: '/dashboard/investment-trading/withdrawals', icon: Wallet },
    ],
  },
  {
    name: 'Real estate Portfolio',
    labelKey: 'realEstatePortfolio',
    href: '/dashboard/real-estate',
    icon: Building2,
    children: [
      { name: 'My Properties', labelKey: 'myProperties', href: '/dashboard/real-estate/my-properties', icon: Home },
      { name: 'Property Earnings', labelKey: 'propertyEarnings', href: '/dashboard/real-estate/property-earnings', icon: LineChart },
      { name: 'Withdrawals', labelKey: 'withdrawals', href: '/dashboard/real-estate/withdrawals', icon: Wallet },
    ],
  },
  { name: 'Referrals', labelKey: 'referrals', href: '/dashboard/referrals', icon: Link2 },
  { name: 'Fund Account', href: '/dashboard/account/fund', icon: Wallet },
  { name: 'Withdraw Funds', href: '/dashboard/account/withdraw', icon: Wallet },
  { name: 'KYC Verification', href: '/dashboard/kyc', icon: ShieldCheck },
  { name: 'Account History', href: '/dashboard/account/history', icon: History },
  { name: 'Activity', labelKey: 'activity', href: '/dashboard/activity', icon: History },
  { name: 'Support', labelKey: 'support', href: '/dashboard/support', icon: LifeBuoy },
  { name: 'Settings', labelKey: 'settings', href: '/dashboard/settings', icon: Settings },
]

interface DashboardSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function DashboardSidebar({ isOpen, onClose }: DashboardSidebarProps) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const [hash, setHash] = useState('')
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('dashboard_sidebar_collapsed') === 'true'
  })
  const [isTradingOpen, setIsTradingOpen] = useState(true)
  const [isRealEstateOpen, setIsRealEstateOpen] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const updateHash = () => setHash(window.location.hash || '')
    updateHash()
    window.addEventListener('hashchange', updateHash)
    return () => window.removeEventListener('hashchange', updateHash)
  }, [pathname])

  const isTradingRoute = pathname?.startsWith('/dashboard/investment-trading')
  const isRealEstateRoute = pathname?.startsWith('/dashboard/real-estate')

  const isParentOpen = (href: string) => {
    if (href === '/dashboard/investment-trading') return isTradingRoute ? true : isTradingOpen
    if (href === '/dashboard/real-estate') return isRealEstateRoute ? true : isRealEstateOpen
    return false
  }

  const toggleParent = (href: string) => {
    if (href === '/dashboard/investment-trading') {
      setIsTradingOpen(prev => !prev)
      return
    }
    if (href === '/dashboard/real-estate') {
      setIsRealEstateOpen(prev => !prev)
    }
  }

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
            aria-label={isCollapsed ? t('expandSidebar') : t('collapseSidebar')}
            title={isCollapsed ? t('expandSidebar') : t('collapseSidebar')}
          >
            {isCollapsed ? <ChevronsRight size={16} className="text-white" /> : <ChevronsLeft size={16} className="text-white" />}
          </button>
        </div>

        <nav className="space-y-2 flex-1">
          {menuItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname?.startsWith(item.href))

            const Icon = item.icon

            if ('children' in item) {
              const parentOpen = isParentOpen(item.href)
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
                    title={isCollapsed ? (item.labelKey ? t(item.labelKey) : item.name) : undefined}
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
                    {!isCollapsed && (
                      <span className="font-medium">
                        {item.labelKey ? t(item.labelKey) : item.name}
                      </span>
                    )}
                    </Link>
                    {!isCollapsed && (
                      <button
                        type="button"
                        onClick={() => toggleParent(item.href)}
                        className="ml-auto p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        aria-label={parentOpen ? t('collapseSectionLinks') : t('expandSectionLinks')}
                      >
                        {parentOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    )}
                  </div>
                    {!isCollapsed && parentOpen && (
                      <div className="ml-10 space-y-1">
                      {item.children?.map(child => {
                        const childActive =
                          pathname === child.href ||
                          (item.href === '/dashboard/investment-trading' &&
                            child.href.includes('#') &&
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
                            <span className="font-medium">
                              {child.labelKey ? t(child.labelKey) : child.name}
                            </span>
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
                {!isCollapsed && (
                  <span className="font-medium">
                    {item.labelKey ? t(item.labelKey) : item.name}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="pt-4 mt-4 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.12)' }}>
          <Link
            href="/live-payments"
            className={`mb-2 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-3 rounded-lg transition-all group`}
            style={{
              color: 'rgba(187, 247, 208, 0.95)',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(74, 222, 128, 0.35)',
            }}
            title={isCollapsed ? 'Live Payment Stream' : undefined}
          >
            <div
              className="p-1.5 rounded-lg transition-all transform group-hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.24), rgba(5, 150, 105, 0.12))',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(74, 222, 128, 0.35)',
              }}
            >
              <Radio size={18} strokeWidth={2} />
            </div>
            {!isCollapsed && <span className="font-medium">Live Payment Stream</span>}
          </Link>

          <Link
            href="/"
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-3 rounded-lg transition-all group`}
            style={{
              color: 'rgba(255, 255, 255, 0.75)',
              border: '1px solid transparent',
            }}
            title={isCollapsed ? t('returnToMainSite') : undefined}
          >
            <div
              className="p-1.5 rounded-lg transition-all transform group-hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02))',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <Home size={18} strokeWidth={2} />
            </div>
            {!isCollapsed && <span className="font-medium">{t('returnToMainSite')}</span>}
          </Link>
        </div>
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
          <h2 className="text-xl font-bold text-white">{t('menu')}</h2>
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
              const parentOpen = isParentOpen(item.href)
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
                      <span className="font-medium">{item.labelKey ? t(item.labelKey) : item.name}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleParent(item.href)}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                      aria-label={parentOpen ? t('collapseSectionLinks') : t('expandSectionLinks')}
                    >
                      {parentOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  </div>
                  {parentOpen && (
                    <div className="ml-10 space-y-1">
                      {item.children?.map(child => {
                        const childActive =
                          pathname === child.href ||
                          (item.href === '/dashboard/investment-trading' &&
                            child.href.includes('#') &&
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
                          <span className="font-medium">{child.labelKey ? t(child.labelKey) : child.name}</span>
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
                <span className="font-medium">{item.labelKey ? t(item.labelKey) : item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="pt-5 mt-5 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.12)' }}>
          <Link
            href="/live-payments"
            onClick={onClose}
            className="mb-2 flex items-center gap-3 px-4 py-3 rounded-lg transition-all"
            style={{
              color: 'rgba(187, 247, 208, 0.95)',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(74, 222, 128, 0.35)',
            }}
          >
            <div
              className="p-1.5 rounded-lg transition-all"
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.24), rgba(5, 150, 105, 0.12))',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(74, 222, 128, 0.35)',
              }}
            >
              <Radio size={18} strokeWidth={2} />
            </div>
            <span className="font-medium">Live Payment Stream</span>
          </Link>

          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all"
            style={{
              color: 'rgba(255, 255, 255, 0.78)',
              border: '1px solid transparent',
            }}
          >
            <div
              className="p-1.5 rounded-lg transition-all"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02))',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <Home size={18} strokeWidth={2} />
            </div>
            <span className="font-medium">{t('returnToMainSite')}</span>
          </Link>
        </div>
      </aside>
    </>
  )
}
