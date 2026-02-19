'use client'

import { useEffect, useMemo, useState } from 'react'
import { ShieldAlert, X } from 'lucide-react'

type FreezeStatusPayload = {
  active: boolean
  reasons: string[]
  note: string | null
  signature: string
  updatedAt: string | null
}

const REMINDER_COOLDOWN_MS = 60_000

export default function AccountFreezeAlertPopup() {
  const [payload, setPayload] = useState<FreezeStatusPayload | null>(null)
  const [visible, setVisible] = useState(false)
  const [dismissedUntil, setDismissedUntil] = useState(0)
  const [lastSignature, setLastSignature] = useState('')

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      try {
        const response = await fetch('/api/user/account-balance/freeze-status', {
          method: 'GET',
          cache: 'no-store',
        })
        if (!response.ok) return

        const next = (await response.json()) as FreezeStatusPayload
        if (!isMounted) return
        setPayload(next)

        if (!next.active) {
          setVisible(false)
          setDismissedUntil(0)
          setLastSignature('')
          return
        }

        const now = Date.now()
        const hasChanged = next.signature !== lastSignature
        if (hasChanged) {
          setLastSignature(next.signature)
          setDismissedUntil(0)
          setVisible(true)
          return
        }

        if (now >= dismissedUntil) {
          setVisible(true)
        }
      } catch {
        // Keep silent. Popup should not crash dashboard on transient errors.
      }
    }

    void load()
    const intervalId = window.setInterval(load, 30_000)
    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [dismissedUntil, lastSignature])

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
              setDismissedUntil(Date.now() + REMINDER_COOLDOWN_MS)
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
              • {reason}
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

