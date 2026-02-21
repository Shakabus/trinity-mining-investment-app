self.addEventListener('push', event => {
  if (!event) return

  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = {}
  }

  const title = typeof payload.title === 'string' && payload.title.trim().length > 0
    ? payload.title.trim()
    : 'Admin update'
  const body =
    typeof payload.body === 'string' && payload.body.trim().length > 0
      ? payload.body.trim()
      : 'A new activity requires your attention.'
  const href =
    typeof payload.href === 'string' && payload.href.trim().length > 0
      ? payload.href.trim()
      : '/admin'
  const tag =
    typeof payload.tag === 'string' && payload.tag.trim().length > 0
      ? payload.tag.trim()
      : `admin-${Date.now()}`
  const requireInteraction = Boolean(payload.requireInteraction)

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag,
      requireInteraction,
      data: { href },
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const targetHref =
    event.notification &&
    event.notification.data &&
    typeof event.notification.data.href === 'string'
      ? event.notification.data.href
      : '/admin'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'admin-push-click', href: targetHref })
          client.focus()
          if ('navigate' in client) {
            return client.navigate(targetHref)
          }
          return client
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetHref)
      }
      return undefined
    })
  )
})
