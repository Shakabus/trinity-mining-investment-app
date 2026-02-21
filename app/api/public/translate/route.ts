import { NextResponse } from 'next/server'
import { isInputValidationError, readJsonObject, readStringField } from '@/lib/requestValidation'
import { isSupportedLanguage } from '@/lib/i18n'
import { getGoogleTranslateApiKey } from '@/lib/security-env'

const TRANSLATE_ALLOWED_FIELDS = ['text', 'texts', 'language'] as const
const MAX_TEXT_LENGTH = 420
const MAX_BATCH_TEXTS = 24
const REQUEST_TIMEOUT_MS = 7000

export const dynamic = 'force-dynamic'

const memoryCache = new Map<string, string>()

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function extractTranslatedText(payload: unknown) {
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) return null

  const chunks = payload[0] as unknown[]
  const translated = chunks
    .map(chunk => (Array.isArray(chunk) ? chunk[0] : ''))
    .filter(value => typeof value === 'string')
    .join('')
    .trim()

  return translated || null
}

function extractTranslatedTextV2(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null
  const data = (payload as { data?: { translations?: Array<{ translatedText?: unknown }> } }).data
  const first = data?.translations?.[0]
  if (!first || typeof first.translatedText !== 'string') return null
  return first.translatedText.trim() || null
}

function extractTranslatedTextMyMemory(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null
  const responseData = (payload as { responseData?: { translatedText?: unknown } }).responseData
  if (!responseData || typeof responseData.translatedText !== 'string') return null
  const decoded = decodeHtmlEntities(responseData.translatedText).trim()
  return decoded || null
}

function cacheKey(language: string, text: string) {
  return `${language}:${text}`
}

function parseInputTexts(body: Record<string, unknown>) {
  const singleText = readStringField(body, 'text', {
    required: false,
    minLength: 1,
    maxLength: MAX_TEXT_LENGTH,
  })

  const rawTexts = body.texts
  const listFromArray: string[] = []
  if (rawTexts != null) {
    if (!Array.isArray(rawTexts)) {
      throw new Error('texts must be an array.')
    }
    if (rawTexts.length === 0 || rawTexts.length > MAX_BATCH_TEXTS) {
      throw new Error(`texts must contain between 1 and ${MAX_BATCH_TEXTS} items.`)
    }
    for (const entry of rawTexts) {
      if (typeof entry !== 'string') {
        throw new Error('texts entries must be strings.')
      }
      const value = entry.trim()
      if (!value || value.length > MAX_TEXT_LENGTH) {
        throw new Error('Each text entry must be between 1 and 420 characters.')
      }
      listFromArray.push(value)
    }
  }

  const texts = listFromArray.length > 0 ? listFromArray : singleText ? [singleText] : []
  if (texts.length === 0) {
    throw new Error('text is required.')
  }

  return texts
}

async function translateOne(text: string, language: string, googleApiKey: string | null) {
  if (language === 'en') return text

  const existing = memoryCache.get(cacheKey(language, text))
  if (existing) return existing

  let translated: string | null = null

  if (googleApiKey) {
    try {
      const params = new URLSearchParams({ key: googleApiKey })
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
      const upstream = await fetch(`https://translation.googleapis.com/language/translate/v2?${params.toString()}`, {
        method: 'POST',
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          target: language,
          format: 'text',
        }),
      })
      clearTimeout(timeout)

      if (upstream.ok) {
        const payload = await upstream.json().catch(() => null)
        translated = extractTranslatedTextV2(payload)
      }
    } catch {
      translated = null
    }
  }

  if (!translated) {
    try {
      const params = new URLSearchParams({
        client: 'gtx',
        sl: 'auto',
        tl: language,
        dt: 't',
        q: text,
      })

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
      const upstream = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (upstream.ok) {
        const payload = await upstream.json().catch(() => null)
        translated = extractTranslatedText(payload)
      }
    } catch {
      translated = null
    }
  }

  if (!translated) {
    try {
      const params = new URLSearchParams({
        q: text,
        langpair: `en|${language}`,
      })

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
      const upstream = await fetch(`https://api.mymemory.translated.net/get?${params.toString()}`, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (upstream.ok) {
        const payload = await upstream.json().catch(() => null)
        translated = extractTranslatedTextMyMemory(payload)
      }
    } catch {
      translated = null
    }
  }

  if (!translated) return null

  memoryCache.set(cacheKey(language, text), translated)
  return translated
}

export async function POST(req: Request) {
  try {
    const body = await readJsonObject(req, { allowedKeys: TRANSLATE_ALLOWED_FIELDS })
    let texts: string[] = []
    try {
      texts = parseInputTexts(body)
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid text input.' }, { status: 400 })
    }
    const language = readStringField(body, 'language', { required: true })!

    if (!isSupportedLanguage(language)) {
      return NextResponse.json({ error: 'Unsupported language.' }, { status: 400 })
    }

    const googleApiKey = getGoogleTranslateApiKey()
    const translations = await Promise.all(texts.map(text => translateOne(text, language, googleApiKey)))

    if (texts.length === 1 && readStringField(body, 'text', { required: false })) {
      return NextResponse.json({ translated: translations[0] })
    }

    return NextResponse.json({ translations })
  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Public translate error:', error)
    return NextResponse.json({ translated: null }, { status: 200 })
  }
}
