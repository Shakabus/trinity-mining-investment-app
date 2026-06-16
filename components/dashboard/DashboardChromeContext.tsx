'use client'

import { createContext, useContext } from 'react'

const DashboardChromeHiddenContext = createContext(false)

export function DashboardChromeProvider({
  hidden,
  children,
}: {
  hidden: boolean
  children: React.ReactNode
}) {
  return (
    <DashboardChromeHiddenContext.Provider value={hidden}>
      {children}
    </DashboardChromeHiddenContext.Provider>
  )
}

export function useDashboardChromeHidden() {
  return useContext(DashboardChromeHiddenContext)
}
