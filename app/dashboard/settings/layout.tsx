'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const settingsItems = [
  { name: 'Account', href: '/dashboard/settings' },
  { name: 'Wallet', href: '/dashboard/settings/wallet' },
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-white/70">Manage your account settings and preferences</p>
      </div>

      {/* Mobile: Horizontal Tabs (Top) */}
      <div className="md:hidden">
        <div 
          className="p-2 rounded-3xl flex gap-2"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          {settingsItems.map((item) => {
            const isActive = pathname === item.href
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 text-center px-4 py-2 rounded-lg transition-all text-sm font-medium"
                style={{
                  background: isActive 
                    ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1))'
                    : 'transparent',
                  color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                  border: isActive ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid transparent',
                }}
              >
                {item.name}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Desktop: Side Navigation + Content */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Desktop Navigation (Hidden on Mobile) */}
        <div 
          className="hidden md:block w-64 p-4 rounded-3xl h-fit"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <nav className="space-y-2">
            {settingsItems.map((item) => {
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-4 py-2 rounded-lg transition-all"
                  style={{
                    background: isActive 
                      ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05))'
                      : 'transparent',
                    color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                    border: isActive ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid transparent',
                  }}
                >
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1">
          {children}
        </div>
      </div>
      </div>
    </div>
  )
}
