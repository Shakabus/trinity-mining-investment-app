'use client'

import { useEffect } from 'react'

const HEARTBEAT_INTERVAL_MS = 30_000

async function sendHeartbeat() {
  try {
    await fetch('/api/user/presence/heartbeat', {
      method: 'POST',
      cache: 'no-store',
      keepalive: true,
    })
  } catch {
    // Silent fail: presence tracking should never block user flow.
  }
}

export default function UserPresenceTracker() {
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null

    const tick = () => {
      if (document.visibilityState !== 'visible') return
      void sendHeartbeat()
    }

    // Immediate heartbeat when dashboard mounts.
    tick()
    interval = setInterval(tick, HEARTBEAT_INTERVAL_MS)

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void sendHeartbeat()
      }
    }

    const onFocus = () => {
      void sendHeartbeat()
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)

    return () => {
      if (interval) clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  return null
}

