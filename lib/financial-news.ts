import { createHash } from 'crypto'
import { normalizeTickerText, type NotificationTickerItem } from '@/lib/notification-ticker'

type NewsProvider = 'newsapi' | 'fmp' | 'rss'

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

function decodeXmlEntities(input: string) {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

async function fetchYahooRssItems(): Promise<FinancialNewsItem[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 4500)
  try {
    const url =
      'https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC,%5EDJI,%5EIXIC&region=US&lang=en-US'
    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/rss+xml, application/xml, text/xml' },
    })

    if (!response.ok) return []
    const xml = await response.text()
    const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []

    return itemBlocks
      .map(block => {
        const titleMatch = block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/i)
        const dateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)
        const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/i)

        const rawTitle = titleMatch?.[1] || titleMatch?.[2] || ''
        const title = decodeXmlEntities(rawTitle.trim())
        if (!title) return null

        const rawDate = (dateMatch?.[1] || '').trim()
        const publishedAt = Number.isNaN(new Date(rawDate).getTime())
          ? new Date().toISOString()
          : new Date(rawDate).toISOString()
        const link = decodeXmlEntities((linkMatch?.[1] || '').trim())

        return {
          id: stableNewsId(`${link || title}|${publishedAt}`),
          title,
          publishedAt,
        } satisfies FinancialNewsItem
      })
      .filter((item): item is FinancialNewsItem => Boolean(item))
      .slice(0, MAX_FETCH_ITEMS)
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

  if (!providers.includes('rss')) {
    providers.push('rss')
  }

  for (const provider of providers) {
    const rows =
      provider === 'newsapi'
        ? await fetchNewsApiItems(newsApiKey)
        : provider === 'fmp'
          ? await fetchFmpItems(fmpApiKey)
          : await fetchYahooRssItems()
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
