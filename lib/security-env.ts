import 'server-only'

type NonEmptyString = string & { __nonEmpty: true }

function asNonEmpty(value: string | undefined | null): NonEmptyString | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  return trimmed as NonEmptyString
}

function read(name: string) {
  return asNonEmpty(process.env[name])
}

export function getUpstashConfig() {
  const url = read('UPSTASH_REDIS_REST_URL')
  const token = read('UPSTASH_REDIS_REST_TOKEN')
  if (!url || !token) return null
  return { url, token }
}

export function getCoinGeckoConfig() {
  const apiBaseUrl = read('COINGECKO_API_BASE_URL') || ('https://api.coingecko.com/api/v3' as NonEmptyString)
  const apiKey = read('COINGECKO_API_KEY')
  const apiKeyHeader = read('COINGECKO_API_KEY_HEADER') || ('x-cg-demo-api-key' as NonEmptyString)

  return {
    apiBaseUrl,
    apiKey,
    apiKeyHeader,
  }
}

export function getGoogleTranslateApiKey() {
  return read('GOOGLE_TRANSLATE_API_KEY')
}

export function getMoonPayConfig() {
  const publishableKey = read('MOONPAY_PUBLISHABLE_KEY')
  const secretKey = read('MOONPAY_SECRET_KEY')
  const baseUrl = read('MOONPAY_BASE_URL') || ('https://buy.moonpay.com' as NonEmptyString)

  return {
    publishableKey,
    secretKey,
    baseUrl,
  }
}

export function getCronSecrets() {
  const current = read('CRON_SECRET')
  const previous = read('CRON_SECRET_PREVIOUS')
  return [current, previous].filter(Boolean) as NonEmptyString[]
}

export function secureStringEqual(left: string, right: string) {
  if (left.length !== right.length) return false

  let diff = 0
  for (let i = 0; i < left.length; i += 1) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i)
  }
  return diff === 0
}

export function matchesAnySecret(candidate: string, secrets: readonly string[]) {
  for (const secret of secrets) {
    if (secureStringEqual(candidate, secret)) {
      return true
    }
  }
  return false
}
