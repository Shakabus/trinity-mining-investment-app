'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

type DashboardAutoRefreshProps = {
  intervalMs?: number
}

export default function DashboardAutoRefresh({ intervalMs = 60000 }: DashboardAutoRefreshProps) {
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return
      }
      router.refresh()
    }, intervalMs)

    return () => clearInterval(interval)
  }, [intervalMs, router])

  return null
}

