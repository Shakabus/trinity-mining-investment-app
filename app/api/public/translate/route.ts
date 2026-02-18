import { NextResponse } from 'next/server'
import { isInputValidationError, readJsonObject, readStringField } from '@/lib/requestValidation'
import { isSupportedLanguage } from '@/lib/i18n'

const TRANSLATE_ALLOWED_FIELDS = ['text', 'language'] as const
const MAX_TEXT_LENGTH = 420

export const dynamic = 'force-dynamic'

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

export async function POST(req: Request) {
  try {
    const body = await readJsonObject(req, { allowedKeys: TRANSLATE_ALLOWED_FIELDS })
    const text = readStringField(body, 'text', {
      required: true,
      minLength: 1,
      maxLength: MAX_TEXT_LENGTH,
    })!
    const language = readStringField(body, 'language', { required: true })!

    if (!isSupportedLanguage(language)) {
      return NextResponse.json({ error: 'Unsupported language.' }, { status: 400 })
    }

    if (language === 'en') {
      return NextResponse.json({ translated: text })
    }

    const params = new URLSearchParams({
      client: 'gtx',
      sl: 'auto',
      tl: language,
      dt: 't',
      q: text,
    })

    const upstream = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`, {
      method: 'GET',
      cache: 'no-store',
    })

    if (!upstream.ok) {
      return NextResponse.json({ translated: null }, { status: 200 })
    }

    const payload = await upstream.json().catch(() => null)
    const translated = extractTranslatedText(payload)
    return NextResponse.json({ translated })
  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Public translate error:', error)
    return NextResponse.json({ translated: null }, { status: 200 })
  }
}
