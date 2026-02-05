export const SUPPORTED_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CAD',
  'AUD',
  'CHF',
  'CNY',
  'INR',
  'BRL',
] as const

export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number]

export type FxRates = Record<CurrencyCode, number>

const DEFAULT_RATES: FxRates = {
  USD: 1,
  EUR: 0,
  GBP: 0,
  JPY: 0,
  CAD: 0,
  AUD: 0,
  CHF: 0,
  CNY: 0,
  INR: 0,
  BRL: 0,
}

const CACHE: { fetchedAt: number; rates: FxRates } = {
  fetchedAt: 0,
  rates: { ...DEFAULT_RATES },
}

export const isSupportedCurrency = (code: string): code is CurrencyCode =>
  SUPPORTED_CURRENCIES.includes(code as CurrencyCode)

export async function getFxRates(): Promise<FxRates> {
  const now = Date.now()
  if (CACHE.fetchedAt && now - CACHE.fetchedAt < 30 * 60 * 1000) {
    return CACHE.rates
  }

  try {
    const symbols = SUPPORTED_CURRENCIES.join(',')
    const res = await fetch(
      `https://api.exchangerate.host/latest?base=USD&symbols=${symbols}`,
      { cache: 'no-store' }
    )
    if (!res.ok) {
      throw new Error('FX fetch failed')
    }
    const json = await res.json()
    const rates = { ...DEFAULT_RATES }
    for (const code of SUPPORTED_CURRENCIES) {
      const value = Number(json?.rates?.[code])
      rates[code] = Number.isFinite(value) && value > 0 ? value : rates[code]
    }
    rates.USD = 1
    CACHE.rates = rates
    CACHE.fetchedAt = now
    return rates
  } catch {
    return CACHE.rates
  }
}

export function convertUsd(amountUsd: number, rates: FxRates, currency: CurrencyCode) {
  const rate = rates[currency] ?? 1
  return amountUsd * rate
}

export function formatCurrency(amount: number, currency: CurrencyCode) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}
