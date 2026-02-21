import { isSupportedLanguage, type LanguageCode } from '@/lib/i18n'

const GLOBAL_LANGUAGE_STORAGE_KEY = 'trinity_language_preference'
const LEGACY_MARKETING_LANGUAGE_STORAGE_KEY = 'marketing_language_preference'
const LEGACY_DASHBOARD_LANGUAGE_STORAGE_KEY = 'dashboard_language_preference'
const LANGUAGE_CHANGE_EVENT = 'trinity:language-changed'

const STORAGE_KEYS = [
  GLOBAL_LANGUAGE_STORAGE_KEY,
  LEGACY_MARKETING_LANGUAGE_STORAGE_KEY,
  LEGACY_DASHBOARD_LANGUAGE_STORAGE_KEY,
] as const

function safeReadStorage(key: string) {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeWriteStorage(key: string, value: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // ignore privacy mode / quota issues
  }
}

export function readPreferredLanguage(fallback: LanguageCode = 'en'): LanguageCode {
  for (const key of STORAGE_KEYS) {
    const value = safeReadStorage(key)
    if (value && isSupportedLanguage(value)) {
      return value
    }
  }
  return fallback
}

export function syncPreferredLanguage(language: LanguageCode) {
  if (typeof window === 'undefined') return

  STORAGE_KEYS.forEach(key => safeWriteStorage(key, language))
  document.documentElement.lang = language
  window.dispatchEvent(
    new CustomEvent<{ language: LanguageCode }>(LANGUAGE_CHANGE_EVENT, {
      detail: { language },
    }),
  )
}

export function subscribePreferredLanguage(handler: (language: LanguageCode) => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const onCustomEvent = (event: Event) => {
    const nextLanguage = (event as CustomEvent<{ language?: LanguageCode }>).detail?.language
    if (nextLanguage && isSupportedLanguage(nextLanguage)) {
      handler(nextLanguage)
    }
  }

  const onStorage = (event: StorageEvent) => {
    if (!event.key || !STORAGE_KEYS.includes(event.key as (typeof STORAGE_KEYS)[number])) return
    const nextLanguage = event.newValue
    if (nextLanguage && isSupportedLanguage(nextLanguage)) {
      handler(nextLanguage)
    }
  }

  window.addEventListener(LANGUAGE_CHANGE_EVENT, onCustomEvent)
  window.addEventListener('storage', onStorage)

  return () => {
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, onCustomEvent)
    window.removeEventListener('storage', onStorage)
  }
}
