import { isSupportedLanguage, type LanguageCode } from '@/lib/i18n'
import { LANGUAGE_COOKIE_KEY } from '@/lib/language-preference'

export function readLanguageFromCookie(rawValue: string | null | undefined): LanguageCode | null {
  const value = (rawValue || '').trim().toLowerCase()
  if (!value) return null
  return isSupportedLanguage(value) ? value : null
}

export { LANGUAGE_COOKIE_KEY }

