import { prisma } from '@/lib/db'
import { REAL_ESTATE_PROPERTIES, type PropertyItem } from '@/lib/real-estate-property-catalog'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function toTitleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function formatDuration(durationMonths: number) {
  return `${durationMonths} month${durationMonths === 1 ? '' : 's'}`
}

function formatProjectedBand(min: number, max: number) {
  return `${Number(min)}% - ${Number(max)}% total cycle`
}

function buildIllustrativeOutcome(
  minimumUsd: number,
  projectedReturnMin: number,
  projectedReturnMax: number,
  durationMonths: number,
  text: string | null
) {
  if (text?.trim()) {
    return text
  }

  const low = minimumUsd * (projectedReturnMin / 100)
  const high = minimumUsd * (projectedReturnMax / 100)
  return `${formatCurrency(minimumUsd)} -> ${formatCurrency(low)}-${formatCurrency(high)} over ${durationMonths} months`
}

export async function getRealEstatePropertySpotlightItems(): Promise<PropertyItem[]> {
  const properties = await prisma.realEstateProperty.findMany({
    where: { status: { not: 'archived' } },
    include: {
      tiers: {
        where: { isActive: true },
        orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  })

  if (!properties.length) {
    return REAL_ESTATE_PROPERTIES
  }

  return properties.map(property => {
    const location =
      [property.city, property.country].filter(Boolean).join(', ') || property.market || 'Global'
    const primaryTier = property.tiers[0]

    return {
      id: property.slug,
      title: property.title,
      location,
      tag: `${toTitleCase(property.assetType || 'Asset')} Asset`,
      summary: property.summary,
      imageSrc: property.imagePath || '/properties/placeholder.jpg',
      imageAlternates: [],
      imageFallback:
        `Add property image: /public/properties/${property.slug}.jpg`,
      facts: [
        { label: 'Address', value: property.address || 'Address available on request' },
        { label: 'Market', value: property.market || location },
        {
          label: 'Asset Scale',
          value: property.keyCount != null ? `${property.keyCount} keys` : `${property.tiers.length} buy-in tiers`,
        },
        {
          label: 'Income Logic',
          value: primaryTier?.payoutModel || 'Monthly performance-linked distribution',
        },
      ],
      modalTitle: property.title,
      modalLocation: property.address || location,
      overview: property.overview || property.summary,
      highlights: [
        `${property.tiers.length} active buy-in tiers`,
        `Status: ${toTitleCase(property.status)}`,
        `Primary payout basis: ${primaryTier?.payoutModel || 'Performance-linked distribution'}`,
        'Tracked under Trinity reporting and controlled payout windows',
      ],
      options: property.tiers.map(tier => ({
        tier: tier.tierName,
        minimum: formatCurrency(Number(tier.minimumUsd)),
        duration: formatDuration(tier.durationMonths),
        payoutModel: tier.payoutModel,
        projectedBand: formatProjectedBand(Number(tier.projectedReturnMin), Number(tier.projectedReturnMax)),
        illustrativeOutcome: buildIllustrativeOutcome(
          Number(tier.minimumUsd),
          Number(tier.projectedReturnMin),
          Number(tier.projectedReturnMax),
          tier.durationMonths,
          tier.projectedOutcomeText
        ),
      })),
    }
  })
}
