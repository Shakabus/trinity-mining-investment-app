'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ShieldAlert, X } from 'lucide-react'

type FreezeStatusPayload = {
  active: boolean
  reasons: string[]
  note: string | null
  signature: string
  updatedAt: string | null
}

const REMINDER_COOLDOWN_MS = 60_000
const POLL_INTERVAL_MS = 10_000

export default function AccountFreezeAlertPopup() {
  const [payload, setPayload] = useState<FreezeStatusPayload | null>(null)
  const [visible, setVisible] = useState(false)
  const dismissedUntilRef = useRef(0)
  const lastSignatureRef = useRef('')
  const payloadRef = useRef<FreezeStatusPayload | null>(null)
  const mountedRef = useRef(false)

  const syncVisibility = useCallback((next: FreezeStatusPayload) => {
    if (!next.active) {
      setVisible(false)
      dismissedUntilRef.current = 0
      lastSignatureRef.current = ''
      return
    }

    const now = Date.now()
    const hasChanged = next.signature !== lastSignatureRef.current
    if (hasChanged) {
      lastSignatureRef.current = next.signature
      dismissedUntilRef.current = 0
      setVisible(true)
      return
    }

    if (now >= dismissedUntilRef.current) {
      setVisible(true)
    }
  }, [])

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/user/account-balance/freeze-status', {
        method: 'GET',
        cache: 'no-store',
      })
      if (!response.ok) return

      const next = (await response.json()) as FreezeStatusPayload
      if (!mountedRef.current) return

      payloadRef.current = next
      setPayload(next)
      syncVisibility(next)
    } catch {
      // Keep silent. Popup should not crash dashboard on transient errors.
    } finally {
      const current = payloadRef.current
      if (current?.active && Date.now() >= dismissedUntilRef.current) {
        setVisible(true)
      }
    }
  }, [syncVisibility])

  useEffect(() => {
    mountedRef.current = true
    void load()

    const intervalId = window.setInterval(() => {
      void load()
    }, POLL_INTERVAL_MS)

    const handleFocus = () => {
      void load()
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void load()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      mountedRef.current = false
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [load])

  const freezeReasons = useMemo(() => payload?.reasons ?? [], [payload])
  if (!payload?.active || !visible) return null

  return (
    <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4 pointer-events-none">
      <div
        className="w-full max-w-2xl rounded-2xl p-4 md:p-5 pointer-events-auto"
        style={{
          background: 'linear-gradient(135deg, rgba(127, 29, 29, 0.94), rgba(69, 10, 10, 0.92))',
          border: '1px solid rgba(252, 165, 165, 0.35)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 18px 44px rgba(0, 0, 0, 0.45)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className="rounded-xl p-2.5 mt-0.5"
              style={{
                background: 'rgba(248, 113, 113, 0.2)',
                border: '1px solid rgba(252, 165, 165, 0.35)',
              }}
            >
              <ShieldAlert size={18} className="text-red-100" />
            </div>
            <div>
              <div className="text-base md:text-lg font-semibold text-red-50">
                Funds are temporarily restricted
              </div>
              <div className="text-sm text-red-100/90 mt-1">
                Some account funds are frozen. Transactions stay limited until restrictions are removed.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setVisible(false)
              dismissedUntilRef.current = Date.now() + REMINDER_COOLDOWN_MS
            }}
            className="rounded-lg p-1.5 hover:bg-white/10 transition-colors"
            aria-label="Dismiss freeze alert"
          >
            <X size={16} className="text-red-100" />
          </button>
        </div>

        <div className="mt-3 space-y-1.5">
          {freezeReasons.slice(0, 6).map(reason => (
            <div key={reason} className="text-xs md:text-sm text-red-50/95">
              - {reason}
            </div>
          ))}
        </div>

        {payload.note ? (
          <div className="mt-3 text-xs md:text-sm text-red-100/90">
            Note: {payload.note}
          </div>
        ) : null}
      </div>
    </div>
  )
}
