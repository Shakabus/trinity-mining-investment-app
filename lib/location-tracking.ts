type HeaderBag = {
  get(name: string): string | null
}

export type LocationEventType = 'signup' | 'login'

export type LocationSnapshot = {
  ipMasked: string | null
  country: string | null
  region: string | null
  city: string | null
  timezone: string | null
  latitude: string | null
  longitude: string | null
  userAgent: string | null
}

export type LocationEventDetail = LocationSnapshot & {
  version: 1
  event: LocationEventType
  capturedAt: string
  source: string
}

const readFirstHeader = (headers: HeaderBag, names: string[]) => {
  for (const name of names) {
    const raw = headers.get(name)
    if (raw && raw.trim()) return raw.trim()
  }
  return null
}

const pickForwardedIp = (value: string | null) => {
  if (!value) return null
  const first = value.split(',')[0]?.trim()
  if (!first) return null
  return first.replace(/^\[|\]$/g, '')
}

const maskIpv4 = (ip: string) => {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  return `${parts[0]}.${parts[1]}.*.*`
}

const maskIpv6 = (ip: string) => {
  const parts = ip.split(':').filter(Boolean)
  if (!parts.length) return null
  if (parts.length === 1) return `${parts[0]}:*:*:*`
  return `${parts[0]}:${parts[1]}:*:*`
}

const maskIp = (ip: string | null) => {
  if (!ip) return null
  if (ip.includes('.')) return maskIpv4(ip)
  if (ip.includes(':')) return maskIpv6(ip)
  return null
}

const toNullIfEmpty = (value: string | null) => {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

export function extractApproxLocation(headers: HeaderBag): LocationSnapshot {
  const rawForwardedIp = readFirstHeader(headers, [
    'x-forwarded-for',
    'cf-connecting-ip',
    'x-real-ip',
    'true-client-ip',
    'x-client-ip',
  ])
  const ip = pickForwardedIp(rawForwardedIp)

  return {
    ipMasked: maskIp(ip),
    country: toNullIfEmpty(headers.get('x-vercel-ip-country')),
    region: toNullIfEmpty(headers.get('x-vercel-ip-country-region')),
    city: toNullIfEmpty(headers.get('x-vercel-ip-city')),
    timezone: toNullIfEmpty(headers.get('x-vercel-ip-timezone')),
    latitude: toNullIfEmpty(headers.get('x-vercel-ip-latitude')),
    longitude: toNullIfEmpty(headers.get('x-vercel-ip-longitude')),
    userAgent: toNullIfEmpty(headers.get('user-agent')),
  }
}

export function hasApproxLocationData(location: LocationSnapshot) {
  return Boolean(
    location.country ||
      location.region ||
      location.city ||
      location.timezone ||
      location.latitude ||
      location.longitude ||
      location.ipMasked
  )
}

export function buildLocationEventDetail(input: {
  event: LocationEventType
  source: string
  capturedAt?: Date
  location: LocationSnapshot
}) {
  const detail: LocationEventDetail = {
    version: 1,
    event: input.event,
    capturedAt: (input.capturedAt ?? new Date()).toISOString(),
    source: input.source,
    ...input.location,
  }
  return JSON.stringify(detail)
}

export function parseLocationEventDetail(detail: string | null | undefined) {
  if (!detail) return null
  try {
    const parsed = JSON.parse(detail) as Partial<LocationEventDetail>
    if (parsed?.version !== 1) return null
    if (parsed.event !== 'signup' && parsed.event !== 'login') return null
    return {
      version: 1 as const,
      event: parsed.event,
      capturedAt: typeof parsed.capturedAt === 'string' ? parsed.capturedAt : null,
      source: typeof parsed.source === 'string' ? parsed.source : null,
      ipMasked: typeof parsed.ipMasked === 'string' ? parsed.ipMasked : null,
      country: typeof parsed.country === 'string' ? parsed.country : null,
      region: typeof parsed.region === 'string' ? parsed.region : null,
      city: typeof parsed.city === 'string' ? parsed.city : null,
      timezone: typeof parsed.timezone === 'string' ? parsed.timezone : null,
      latitude: typeof parsed.latitude === 'string' ? parsed.latitude : null,
      longitude: typeof parsed.longitude === 'string' ? parsed.longitude : null,
      userAgent: typeof parsed.userAgent === 'string' ? parsed.userAgent : null,
    }
  } catch {
    return null
  }
}

export function locationSignature(location: Pick<LocationSnapshot, 'ipMasked' | 'country' | 'region' | 'city'>) {
  return [location.ipMasked ?? '-', location.country ?? '-', location.region ?? '-', location.city ?? '-'].join('|')
}

export function formatLocationLabel(location: Pick<LocationSnapshot, 'city' | 'region' | 'country' | 'ipMasked'>) {
  const parts = [location.city, location.region, location.country].filter(Boolean)
  const area = parts.length ? parts.join(', ') : 'Unknown location'
  return location.ipMasked ? `${area} (${location.ipMasked})` : area
}
