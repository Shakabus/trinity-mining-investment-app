import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import RealEstatePropertyManager, {
  type AdminRealEstateProperty,
} from '@/components/admin/RealEstatePropertyManager'

export const dynamic = 'force-dynamic'

export default async function AdminRealEstatePage() {
  type PropertyRow = {
    id: number
    title: string
    slug: string
    market: string | null
    city: string | null
    country: string | null
    assetType: string
    operatorName: string | null
    address: string | null
    summary: string
    overview: string | null
    imagePath: string | null
    keyCount: number | null
    occupancyRate: Prisma.Decimal | number | null
    status: string
    sortOrder: number
    isFeatured: number | boolean
    createdAt: Date | string
    updatedAt: Date | string
  }

  type TierRow = {
    id: number
    propertyId: number
    tierName: string
    minimumUsd: Prisma.Decimal | number
    durationMonths: number
    payoutModel: string
    projectedReturnMin: Prisma.Decimal | number
    projectedReturnMax: Prisma.Decimal | number
    projectedOutcomeText: string | null
    displayOrder: number
    isActive: number | boolean
    createdAt: Date | string
    updatedAt: Date | string
  }

  const properties = await prisma.$queryRaw<PropertyRow[]>(
    Prisma.sql`
      SELECT
        p.id,
        p.title,
        p.slug,
        p.market,
        p.city,
        p.country,
        p.asset_type AS assetType,
        p.operator_name AS operatorName,
        p.address,
        p.summary,
        p.overview,
        p.image_path AS imagePath,
        p.key_count AS keyCount,
        p.occupancy_rate AS occupancyRate,
        p.status,
        p.sort_order AS sortOrder,
        p.is_featured AS isFeatured,
        p.created_at AS createdAt,
        p.updated_at AS updatedAt
      FROM real_estate_properties p
      ORDER BY p.sort_order ASC, p.created_at DESC
    `
  )

  const propertyIds = properties.map(property => property.id)
  const tiers = propertyIds.length
    ? await prisma.$queryRaw<TierRow[]>(
        Prisma.sql`
          SELECT
            t.id,
            t.property_id AS propertyId,
            t.tier_name AS tierName,
            t.minimum_usd AS minimumUsd,
            t.duration_months AS durationMonths,
            t.payout_model AS payoutModel,
            t.projected_return_min AS projectedReturnMin,
            t.projected_return_max AS projectedReturnMax,
            t.projected_outcome_text AS projectedOutcomeText,
            t.display_order AS displayOrder,
            t.is_active AS isActive,
            t.created_at AS createdAt,
            t.updated_at AS updatedAt
          FROM real_estate_property_tiers t
          WHERE t.property_id IN (${Prisma.join(propertyIds)})
          ORDER BY t.property_id ASC, t.display_order ASC, t.id ASC
        `
      )
    : []

  const toIso = (value: Date | string) =>
    (value instanceof Date ? value : new Date(value)).toISOString()

  const tiersByProperty = tiers.reduce<Map<number, TierRow[]>>((map, tier) => {
    const bucket = map.get(tier.propertyId) ?? []
    bucket.push(tier)
    map.set(tier.propertyId, bucket)
    return map
  }, new Map())

  const initialProperties: AdminRealEstateProperty[] = properties.map(property => ({
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
    isFeatured: Boolean(property.isFeatured),
    createdAt: toIso(property.createdAt),
    updatedAt: toIso(property.updatedAt),
    tiers: (tiersByProperty.get(property.id) ?? []).map(tier => ({
      id: tier.id,
      tierName: tier.tierName,
      minimumUsd: Number(tier.minimumUsd),
      durationMonths: tier.durationMonths,
      payoutModel: tier.payoutModel,
      projectedReturnMin: Number(tier.projectedReturnMin),
      projectedReturnMax: Number(tier.projectedReturnMax),
      projectedOutcomeText: tier.projectedOutcomeText,
      displayOrder: tier.displayOrder,
      isActive: Boolean(tier.isActive),
      createdAt: toIso(tier.createdAt),
      updatedAt: toIso(tier.updatedAt),
    })),
  }))

  return <RealEstatePropertyManager initialProperties={initialProperties} />
}
