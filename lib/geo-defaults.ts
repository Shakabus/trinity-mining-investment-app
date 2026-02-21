import { COUNTRY_OPTIONS, isSupportedCountryName } from '@/lib/countries'
import { type CurrencyCode } from '@/lib/forex'
import { type LanguageCode, languageFromCurrency } from '@/lib/i18n'

const COUNTRY_NAME_ALIAS: Record<string, string> = {
  Bolivia: 'Bolivia',
  Brunei: 'Brunei',
  'Cabo Verde': 'Cape Verde',
  'Czechia': 'Czech Republic',
  'Korea, South': 'South Korea',
  'Korea, North': 'North Korea',
  'Timor-Leste': 'Timor-Leste',
  'Türkiye': 'Turkey',
  'Vatican City State': 'Vatican City',
}

const COUNTRY_SET = new Set<string>(COUNTRY_OPTIONS)

const COUNTRY_CURRENCY_GROUPS: Array<{ currency: CurrencyCode; countries: readonly string[] }> = [
  { currency: 'EUR', countries: ['AT', 'BE', 'CY', 'DE', 'ES', 'FI', 'FR', 'GR', 'IE', 'IT', 'LU', 'MT', 'NL', 'PT', 'SI', 'SK'] },
  { currency: 'GBP', countries: ['GB'] },
  { currency: 'JPY', countries: ['JP'] },
  { currency: 'CAD', countries: ['CA'] },
  { currency: 'AUD', countries: ['AU'] },
  { currency: 'CHF', countries: ['CH', 'LI'] },
  { currency: 'CNY', countries: ['CN'] },
  { currency: 'INR', countries: ['IN'] },
  { currency: 'BRL', countries: ['BR'] },
]

const COUNTRY_LANGUAGE_GROUPS: Array<{ language: LanguageCode; countries: readonly string[] }> = [
  {
    language: 'es',
    countries: ['AR', 'BO', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'ES', 'GT', 'HN', 'MX', 'NI', 'PA', 'PE', 'PY', 'SV', 'UY', 'VE'],
  },
  {
    language: 'fr',
    countries: ['BE', 'BJ', 'CD', 'CF', 'CG', 'CI', 'CM', 'DJ', 'FR', 'GA', 'GN', 'HT', 'KM', 'LU', 'MA', 'MC', 'ML', 'NE', 'RW', 'SN', 'TD', 'TG', 'TN'],
  },
  {
    language: 'de',
    countries: ['AT', 'CH', 'DE', 'LI', 'LU'],
  },
  {
    language: 'it',
    countries: ['IT', 'SM', 'VA'],
  },
  {
    language: 'pt',
    countries: ['AO', 'BR', 'CV', 'GW', 'MZ', 'PT', 'ST', 'TL'],
  },
]

const COUNTRY_TO_CURRENCY = new Map<string, CurrencyCode>()
for (const group of COUNTRY_CURRENCY_GROUPS) {
  for (const code of group.countries) {
    COUNTRY_TO_CURRENCY.set(code, group.currency)
  }
}

const COUNTRY_TO_LANGUAGE = new Map<string, LanguageCode>()
for (const group of COUNTRY_LANGUAGE_GROUPS) {
  for (const code of group.countries) {
    COUNTRY_TO_LANGUAGE.set(code, group.language)
  }
}

let REGION_NAMES: Intl.DisplayNames | null | undefined

function getRegionNames() {
  if (REGION_NAMES !== undefined) return REGION_NAMES
  try {
    REGION_NAMES = new Intl.DisplayNames(['en'], { type: 'region' })
  } catch {
    REGION_NAMES = null
  }
  return REGION_NAMES
}

function sanitizeCountryCode(rawCountry: string | null | undefined) {
  const code = (rawCountry || '').trim().toUpperCase()
  return /^[A-Z]{2}$/.test(code) ? code : null
}

export function resolveCountryNameFromCountry(rawCountry: string | null | undefined) {
  const value = (rawCountry || '').trim()
  if (!value) return null

  if (isSupportedCountryName(value)) return value

  const code = sanitizeCountryCode(value)
  if (!code) return null

  const displayName = getRegionNames()?.of(code)?.trim()
  if (!displayName) return null

  const normalized = COUNTRY_NAME_ALIAS[displayName] || displayName
  if (COUNTRY_SET.has(normalized)) return normalized
  return null
}

export function resolveLocaleDefaultsFromCountry(rawCountry: string | null | undefined) {
  const code = sanitizeCountryCode(rawCountry)
  if (!code) return null

  const preferredCurrency = COUNTRY_TO_CURRENCY.get(code) ?? 'USD'
  const preferredLanguage = COUNTRY_TO_LANGUAGE.get(code) ?? languageFromCurrency(preferredCurrency)

  return {
    countryCode: code,
    preferredCurrency,
    preferredLanguage,
  }
}
