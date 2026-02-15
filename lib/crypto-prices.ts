export const TRACKED_ASSET_COINS = ['BTC', 'ETH', 'SOL', 'USDT'] as const

export type TrackedAssetCoin = (typeof TRACKED_ASSET_COINS)[number]
export type CryptoPriceMap = Record<TrackedAssetCoin, number>

const PRICE_CACHE: {
  fetchedAt: number
  data: CryptoPriceMap | null
} = {
  fetchedAt: 0,
  data: null,
}

const DEFAULT_PRICES: CryptoPriceMap = {
  BTC: 0,
  ETH: 0,
  SOL: 0,
  USDT: 1,
}

export async function getTrackedCryptoPricesUsd(): Promise<CryptoPriceMap> {
  const now = Date.now()
  if (PRICE_CACHE.data && now - PRICE_CACHE.fetchedAt < 5 * 60 * 1000) {
    return PRICE_CACHE.data
  }

  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,tether&vs_currencies=usd',
      { cache: 'no-store' }
    )
    if (!response.ok) {
      throw new Error('Price fetch failed')
    }

    const json = await response.json()
    const data: CryptoPriceMap = {
      BTC: Number(json.bitcoin?.usd) || 0,
      ETH: Number(json.ethereum?.usd) || 0,
      SOL: Number(json.solana?.usd) || 0,
      USDT: Number(json.tether?.usd) || 1,
    }

    PRICE_CACHE.data = data
    PRICE_CACHE.fetchedAt = now
    return data
  } catch {
    return PRICE_CACHE.data || DEFAULT_PRICES
  }
}

export function isTrackedAssetCoin(value: unknown): value is TrackedAssetCoin {
  return typeof value === 'string' && (TRACKED_ASSET_COINS as readonly string[]).includes(value)
}

export function convertUsdToCoin(
  amountUsd: number,
  coinType: TrackedAssetCoin,
  prices: CryptoPriceMap
) {
  const safeAmount = Number.isFinite(amountUsd) ? amountUsd : 0
  const price = prices[coinType]
  if (!price || price <= 0 || safeAmount <= 0) {
    return 0
  }

  return Number((safeAmount / price).toFixed(8))
}

export function convertCoinToUsd(
  amountCoin: number,
  coinType: TrackedAssetCoin,
  prices: CryptoPriceMap
) {
  const safeAmount = Number.isFinite(amountCoin) ? amountCoin : 0
  const price = prices[coinType]
  if (!price || price <= 0 || safeAmount === 0) {
    return 0
  }

  return Number((safeAmount * price).toFixed(2))
}
