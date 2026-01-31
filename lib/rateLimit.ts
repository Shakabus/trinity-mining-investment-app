type RateLimitResult = {
  ok: boolean
  remaining: number
  resetAt: number
}

type RateLimitOptions = {
  key: string
  limit: number
  windowSec: number
}

const memoryStore = new Map<string, { count: number; resetAt: number }>()

const getUpstashConfig = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return { url, token }
}

const fromMemory = ({ key, limit, windowSec }: RateLimitOptions): RateLimitResult => {
  const now = Date.now()
  const existing = memoryStore.get(key)
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowSec * 1000
    memoryStore.set(key, { count: 1, resetAt })
    return { ok: true, remaining: limit - 1, resetAt }
  }

  existing.count += 1
  const remaining = Math.max(0, limit - existing.count)
  const ok = existing.count <= limit
  return { ok, remaining, resetAt: existing.resetAt }
}

const fromUpstash = async ({ key, limit, windowSec }: RateLimitOptions, url: string, token: string) => {
  const incrUrl = `${url}/incr/${encodeURIComponent(key)}`
  const incrRes = await fetch(incrUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })

  if (!incrRes.ok) {
    return null
  }

  const incrData = (await incrRes.json()) as { result?: number }
  const count = incrData?.result ?? 0

  if (count === 1) {
    const expireUrl = `${url}/expire/${encodeURIComponent(key)}/${windowSec}`
    await fetch(expireUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
  }

  const now = Date.now()
  const resetAt = now + windowSec * 1000
  const remaining = Math.max(0, limit - count)
  const ok = count <= limit

  return { ok, remaining, resetAt } satisfies RateLimitResult
}

export const checkRateLimit = async (options: RateLimitOptions): Promise<RateLimitResult> => {
  const upstash = getUpstashConfig()
  if (!upstash) {
    return fromMemory(options)
  }

  try {
    const result = await fromUpstash(options, upstash.url, upstash.token)
    if (!result) {
      return fromMemory(options)
    }
    return result
  } catch {
    return fromMemory(options)
  }
}
