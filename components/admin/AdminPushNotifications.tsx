'use client'

import { useEffect, useRef } from 'react'

type PushConfigResponse = {
  enabled?: boolean
  publicKey?: string | null
}

type PushSubscriptionPayload = {
  endpoint: string
  keys?: {
    p256dh?: string
    auth?: string
  }
}

const SW_PATH = '/admin-push-sw.js'
const SYNC_INTERVAL_MS = 10 * 60 * 1000

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index)
  }
  return outputArray
}

function isValidSubscriptionPayload(input: unknown): input is PushSubscriptionPayload {
  if (!input || typeof input !== 'object') return false
  const value = input as Record<string, unknown>
  if (typeof value.endpoint !== 'string' || value.endpoint.trim().length === 0) return false
  const keys = value.keys
  if (!keys || typeof keys !== 'object') return false
  const keyValues = keys as Record<string, unknown>
  return (
    typeof keyValues.p256dh === 'string' &&
    keyValues.p256dh.trim().length > 0 &&
    typeof keyValues.auth === 'string' &&
    keyValues.auth.trim().length > 0
  )
}

async function fetchPushConfig() {
  const response = await fetch('/api/admin/notifications/push-subscriptions', {
    method: 'GET',
    cache: 'no-store',
  })
  if (!response.ok) return null
  const payload = (await response.json()) as PushConfigResponse
  if (!payload.enabled || !payload.publicKey) return null
  return payload.publicKey
}

export default function AdminPushNotifications() {
  const inFlightRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      return
    }

    let isMounted = true

    const syncSubscription = async () => {
      if (inFlightRef.current || !isMounted) return
      inFlightRef.current = true

      try {
        const publicKey = await fetchPushConfig()
        if (!publicKey) return

        const registration = await navigator.serviceWorker.register(SW_PATH, { scope: '/' })
        const permission =
          Notification.permission === 'granted'
            ? 'granted'
            : await Notification.requestPermission()

        if (permission !== 'granted') {
          const existing = await registration.pushManager.getSubscription()
          if (existing) {
            const data = existing.toJSON()
            if (data.endpoint) {
              await fetch('/api/admin/notifications/push-subscriptions', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endpoint: data.endpoint }),
              }).catch(() => null)
            }
          }
          return
        }

        let subscription = await registration.pushManager.getSubscription()
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          })
        }

        const payload = subscription.toJSON()
        if (!isValidSubscriptionPayload(payload)) return

        await fetch('/api/admin/notifications/push-subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: payload }),
        })
      } catch (error) {
        console.error('Admin push subscription sync error:', error)
      } finally {
        inFlightRef.current = false
      }
    }

    void syncSubscription()

    const intervalId = window.setInterval(() => {
      void syncSubscription()
    }, SYNC_INTERVAL_MS)

    const handleFocus = () => {
      void syncSubscription()
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  return null
}
