import { prisma } from '@/lib/db'
import RealEstatePropertyManager, {
  type AdminRealEstateProperty,
} from '@/components/admin/RealEstatePropertyManager'

export const dynamic = 'force-dynamic'

export default async function AdminRealEstatePage() {
  const properties = await prisma.realEstateProperty.findMany({
    include: {
      tiers: {
        orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  })

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

  return <RealEstatePropertyManager initialProperties={initialProperties} />
}
