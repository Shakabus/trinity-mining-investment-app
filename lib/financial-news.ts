import { createHash } from 'crypto'
import { normalizeTickerText, type NotificationTickerItem } from '@/lib/notification-ticker'

type NewsProvider = 'newsapi' | 'fmp'

type FinancialNewsItem = {
  id: string
  title: string
  publishedAt: string
}

type CacheState = {
  expiresAt: number
  items: NotificationTickerItem[]
}

const FINANCIAL_NEWS_CACHE_TTL_MS = 120_000
const MAX_FETCH_ITEMS = 18

const globalForFinancialNews = globalThis as unknown as {
  financialNewsCache: CacheState | null
  financialNewsInFlight: Promise<NotificationTickerItem[]> | null
}

if (!globalForFinancialNews.financialNewsCache) {
  globalForFinancialNews.financialNewsCache = null
}

if (!globalForFinancialNews.financialNewsInFlight) {
  globalForFinancialNews.financialNewsInFlight = null
}

function inferNewsTone(title: string): NotificationTickerItem['tone'] {
  const value = title.toLowerCase()
  if (/(drops?|slides?|selloff|lawsuit|hack|breach|defaults?|bankrupt|recession|downgrade)/.test(value)) {
    return 'danger'
  }
  if (/(surges?|rall(y|ies)|record high|beats?|approval|growth|upgrades?)/.test(value)) {
    return 'success'
  }
  return 'info'
}

function buildNewsTickerItem(item: FinancialNewsItem): NotificationTickerItem {
  const tone = inferNewsTone(item.title)
  return {
    id: `news-${item.id}`,
    text: normalizeTickerText(`Market news: ${item.title}`),
    tone,
    createdAt: item.publishedAt,
  }
}

function stableNewsId(seed: string) {
  return createHash('sha1').update(seed).digest('hex').slice(0, 14)
}

async function fetchNewsApiItems(apiKey: string): Promise<FinancialNewsItem[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 4500)
  try {
    const url =
      `https://newsapi.org/v2/everything` +
      `?q=(finance%20OR%20markets%20OR%20stocks%20OR%20crypto)` +
      `&language=en&sortBy=publishedAt&pageSize=${MAX_FETCH_ITEMS}&apiKey=${encodeURIComponent(apiKey)}`

    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) return []
    const payload = (await response.json()) as {
      articles?: Array<{ title?: string; publishedAt?: string; url?: string }>
    }
    const articles = Array.isArray(payload.articles) ? payload.articles : []

    return articles
      .map(article => {
        const title = typeof article.title === 'string' ? article.title.trim() : ''
        const publishedAtRaw =
          typeof article.publishedAt === 'string' && article.publishedAt.length > 0
            ? article.publishedAt
            : new Date().toISOString()
        if (!title) return null
        return {
          id: stableNewsId(`${article.url || title}|${publishedAtRaw}`),
          title,
          publishedAt: new Date(publishedAtRaw).toISOString(),
        } satisfies FinancialNewsItem
      })
      .filter((item): item is FinancialNewsItem => Boolean(item))
  } catch {
    return []
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchFmpItems(apiKey: string): Promise<FinancialNewsItem[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 4500)
  try {
    const url = `https://financialmodelingprep.com/api/v3/stock_news?limit=${MAX_FETCH_ITEMS}&apikey=${encodeURIComponent(apiKey)}`
    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) return []
    const payload = (await response.json()) as Array<{
      title?: string
      publishedDate?: string
      url?: string
    }>

    if (!Array.isArray(payload)) return []
    return payload
      .map(article => {
        const title = typeof article.title === 'string' ? article.title.trim() : ''
        const publishedAtRaw =
          typeof article.publishedDate === 'string' && article.publishedDate.length > 0
            ? article.publishedDate
            : new Date().toISOString()
        if (!title) return null
        return {
          id: stableNewsId(`${article.url || title}|${publishedAtRaw}`),
          title,
          publishedAt: new Date(publishedAtRaw).toISOString(),
        } satisfies FinancialNewsItem
      })
      .filter((item): item is FinancialNewsItem => Boolean(item))
  } catch {
    return []
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchFinancialNewsItems(): Promise<NotificationTickerItem[]> {
  const configuredProviderRaw = process.env.FINANCIAL_NEWS_PROVIDER?.trim().toLowerCase() || 'auto'
  const configuredProvider: NewsProvider | 'auto' =
    configuredProviderRaw === 'newsapi' || configuredProviderRaw === 'fmp'
      ? configuredProviderRaw
      : 'auto'

  const newsApiKey = process.env.NEWSAPI_KEY || process.env.NEWS_API_KEY || ''
  const fmpApiKey = process.env.FMP_API_KEY || ''

  const providers: NewsProvider[] =
    configuredProvider === 'auto'
      ? [
          ...(newsApiKey ? (['newsapi'] as const) : []),
          ...(fmpApiKey ? (['fmp'] as const) : []),
        ]
      : [configuredProvider]

  if (providers.length === 0) return []

  for (const provider of providers) {
    const rows =
      provider === 'newsapi'
        ? await fetchNewsApiItems(newsApiKey)
        : await fetchFmpItems(fmpApiKey)
    if (!rows.length) continue
    return rows.map(buildNewsTickerItem)
  }

  return []
}

export async function getFinancialNewsTickerItems(limit: number): Promise<NotificationTickerItem[]> {
  const nowMs = Date.now()
  const cached = globalForFinancialNews.financialNewsCache
  if (cached && cached.expiresAt > nowMs) {
    return cached.items.slice(0, limit)
  }

  if (!globalForFinancialNews.financialNewsInFlight) {
    globalForFinancialNews.financialNewsInFlight = fetchFinancialNewsItems().finally(() => {
      globalForFinancialNews.financialNewsInFlight = null
    })
  }

  const fresh = await globalForFinancialNews.financialNewsInFlight
  globalForFinancialNews.financialNewsCache = {
    expiresAt: Date.now() + FINANCIAL_NEWS_CACHE_TTL_MS,
    items: fresh,
  }
  return fresh.slice(0, limit)
}

