'use client'

import { useEffect, useRef } from 'react'

type AdminPushEvent = {
  id: string
  title: string
  body: string
  href: string
  attentionRequired: boolean
  createdAt: string
}

type PushPayload = {
  events?: AdminPushEvent[]
  generatedAt?: string
}

const POLL_INTERVAL_MS = 10000
const CURSOR_STORAGE_KEY = 'admin_push_cursor_v1'
const SEEN_STORAGE_KEY = 'admin_push_seen_ids_v1'
const PROMPTED_STORAGE_KEY = 'admin_push_permission_prompted_v1'
const MAX_SEEN_IDS = 500

const readCursor = () => {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(CURSOR_STORAGE_KEY)
  return raw && raw.trim().length > 0 ? raw : null
}

const writeCursor = (value: string) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CURSOR_STORAGE_KEY, value)
}

const readSeenIds = () => {
  if (typeof window === 'undefined') return [] as string[]
  try {
    const raw = window.localStorage.getItem(SEEN_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : []
  } catch {
    return []
  }
}

const writeSeenIds = (ids: string[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(ids.slice(-MAX_SEEN_IDS)))
}

function maybeRequestPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'default') return
  if (window.localStorage.getItem(PROMPTED_STORAGE_KEY) === '1') return

  window.localStorage.setItem(PROMPTED_STORAGE_KEY, '1')
  void Notification.requestPermission().catch(() => {
    // Ignore permission errors; polling still runs.
  })
}

function sendBrowserNotification(event: AdminPushEvent) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  const title = event.attentionRequired ? `[Action Required] ${event.title}` : event.title
  const notification = new Notification(title, {
    body: event.body,
    tag: `admin-${event.id}`,
    requireInteraction: event.attentionRequired,
  })

  notification.onclick = () => {
    window.focus()
    if (event.href) {
      window.location.href = event.href
    }
  }
}

export default function AdminPushNotifications() {
  const inFlightRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    maybeRequestPermission()

    const pull = async () => {
      if (inFlightRef.current) return
      inFlightRef.current = true

      try {
        const existingSeen = readSeenIds()
        const seenSet = new Set(existingSeen)
        const cursor = readCursor()
        const response = await fetch(
          `/api/admin/notifications/push?limit=60${cursor ? `&since=${encodeURIComponent(cursor)}` : ''}`,
          { method: 'GET', cache: 'no-store' }
        )
        if (!response.ok) return

        const payload = (await response.json()) as PushPayload
        const events = Array.isArray(payload.events) ? payload.events : []
        const sortedAsc = [...events].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )

        const isBootstrap = !cursor
        if (!isBootstrap) {
          for (const event of sortedAsc) {
            if (seenSet.has(event.id)) continue
            sendBrowserNotification(event)
          }
        }

        for (const event of sortedAsc) {
          seenSet.add(event.id)
        }

        const nextSeen = [...seenSet]
        writeSeenIds(nextSeen)

        const newestEventTime = events[0]?.createdAt
        const nextCursor = newestEventTime || payload.generatedAt
        if (nextCursor) {
          writeCursor(nextCursor)
        }
      } catch {
        // Keep silent; this should never block the admin UI.
      } finally {
        inFlightRef.current = false
      }
    }

    void pull()
    const intervalId = window.setInterval(() => {
      void pull()
    }, POLL_INTERVAL_MS)

    const onFocus = () => {
      void pull()
    }
    window.addEventListener('focus', onFocus)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  return null
}
