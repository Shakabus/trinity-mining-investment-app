import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { REAL_ESTATE_PROPERTIES } from '@/lib/real-estate-property-catalog'

type PropertyFact = { label: string; value: string }
type PropertyOption = {
  tier: string
  minimum: string
  duration: string
  payoutModel: string
  projectedBand: string
  illustrativeOutcome: string
}
type CatalogProperty = {
  id: string
  title: string
  location: string
  tag: string
  summary: string
  imageSrc: string
  facts: PropertyFact[]
  modalTitle: string
  modalLocation: string
  overview: string
  options: PropertyOption[]
}

function sanitizeText(value?: string | null) {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function toNumber(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, '')
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseMonths(value: string) {
  const match = value.match(/(\d+)/)
  if (!match) return 12
  return Number(match[1])
}

function parseProjectedBand(value: string) {
  const parts = value.match(/(\d+(?:\.\d+)?)%/g)
  if (!parts || parts.length < 2) {
    return { min: 100, max: 160 }
  }

  return {
    min: Number(parts[0].replace('%', '')),
    max: Number(parts[1].replace('%', '')),
  }
}

function inferAssetType(tag: string) {
  const normalized = tag.toLowerCase()
  if (normalized.includes('villa')) return 'villa'
  if (normalized.includes('resort')) return 'resort'
  if (normalized.includes('condo')) return 'condo'
  if (normalized.includes('hotel')) return 'hotel'
  return 'hospitality'
}

function parseLocation(location: string) {
  const segments = location
    .split(',')
    .map(segment => segment.trim())
    .filter(Boolean)

  if (segments.length === 0) {
    return { market: null, city: null, country: null }
  }

  if (segments.length === 1) {
    return { market: segments[0], city: segments[0], country: null }
  }

  return {
    market: segments.join(', '),
    city: segments[0],
    country: segments.slice(1).join(', '),
  }
}

function inferKeyCount(facts: PropertyFact[]) {
  for (const fact of facts) {
    const match = `${fact.label} ${fact.value}`.match(/(\d{2,5})\s*(room|key|keys|suite|suites)/i)
    if (match) {
      return Number(match[1])
    }
  }
  return null
}

async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) return null

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } })
  if (!user || user.role !== 'admin') return null
  return user
}

export async function POST() {
  try {
    const adminUser = await requireAdmin()
    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const defaults = REAL_ESTATE_PROPERTIES as CatalogProperty[]
    const existingSlugs = new Set(
      (
        await prisma.realEstateProperty.findMany({
          select: { slug: true },
        })
      ).map(item => item.slug)
    )

    let createdCount = 0

    for (const [index, property] of defaults.entries()) {
      if (existingSlugs.has(property.id)) {
        continue
      }

      const location = parseLocation(property.location)

      await prisma.realEstateProperty.create({
        data: {
          title: property.modalTitle || property.title,
          slug: property.id,
          market: sanitizeText(location.market),
          city: sanitizeText(location.city),
          country: sanitizeText(location.country),
          assetType: inferAssetType(property.tag),
          operatorName: null,
          address: sanitizeText(property.modalLocation),
          summary: property.summary.trim(),
          overview: sanitizeText(property.overview),
          imagePath: sanitizeText(property.imageSrc),
          keyCount: inferKeyCount(property.facts),
          occupancyRate: null,
          status: 'active',
          sortOrder: index,
          isFeatured: index < 4,
          tiers: {
            create: property.options.map((option, tierIndex) => {
              const projectedBand = parseProjectedBand(option.projectedBand)
              return {
                tierName: option.tier.trim(),
                minimumUsd: toNumber(option.minimum),
                durationMonths: parseMonths(option.duration),
                payoutModel: option.payoutModel.trim(),
                projectedReturnMin: projectedBand.min,
                projectedReturnMax: projectedBand.max,
                projectedOutcomeText: sanitizeText(option.illustrativeOutcome),
                displayOrder: tierIndex,
                isActive: true,
              }
            }),
          },
        },
      })

      createdCount += 1
    }

    const properties = await prisma.realEstateProperty.findMany({
      include: {
        tiers: {
          orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })

    const serialized = properties.map(property => ({
      id: property.id,
      title: property.title,
      slug: property.slug,
      market: property.market,
      city: property.city,
      country: property.country,
      assetType: property.assetType,
      operatorName: property.operatorName,
      address: property.address,
      summary: property.summary,
      overview: property.overview,
      imagePath: property.imagePath,
      keyCount: property.keyCount,
      occupancyRate: property.occupancyRate != null ? Number(property.occupancyRate) : null,
      status: property.status,
      sortOrder: property.sortOrder,
      isFeatured: property.isFeatured,
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString(),
      tiers: property.tiers.map(tier => ({
        id: tier.id,
        tierName: tier.tierName,
        minimumUsd: Number(tier.minimumUsd),
        durationMonths: tier.durationMonths,
        payoutModel: tier.payoutModel,
        projectedReturnMin: Number(tier.projectedReturnMin),
        projectedReturnMax: Number(tier.projectedReturnMax),
        projectedOutcomeText: tier.projectedOutcomeText,
        displayOrder: tier.displayOrder,
        isActive: tier.isActive,
        createdAt: tier.createdAt.toISOString(),
        updatedAt: tier.updatedAt.toISOString(),
      })),
    }))

    return NextResponse.json({
      createdCount,
      skippedCount: defaults.length - createdCount,
      properties: serialized,
    })
  } catch (error) {
    console.error('POST import default real-estate properties error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
