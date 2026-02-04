'use client'

import { useState } from 'react'
import DashboardNav from './DashboardNav'
import DashboardSidebar from './DashboardSidebar'

interface DashboardLayoutClientProps {
  children: React.ReactNode
  user: {
    email: string
    fullName: string | null
    accountStatus: string
  } | null
}

export default function DashboardLayoutClient({ children, user }: DashboardLayoutClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div
      className="h-screen overflow-hidden"
      style={{ background: '#000000' }}
    >
      <div className="h-full flex">
        {/* Sidebar */}
        <DashboardSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        {/* Main Column */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Top Navigation (sticky) */}
          <DashboardNav user={user} onMenuClick={() => setIsSidebarOpen(true)} />

          {/* Scroll Container: ONLY this scrolls (NO padding here) */}
          <main className="flex-1 min-h-0 overflow-y-auto glass-scroll">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
