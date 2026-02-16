import { prisma } from '@/lib/db'
import type { Prisma, PrismaClient } from '@prisma/client'

type DbClient = PrismaClient | Prisma.TransactionClient

type MiningPlanCatalogItem = {
  slug: string
  basePrice: number
  durationDays: number
  durationLabel: string
  features: string[]
}

export const MINING_PLAN_PRICE_TIERS: Record<string, number> = {
  'starter-plan': 2000,
  'growth-plan': 5000,
  'standard-plan': 10000,
  'pro-plan': 20000,
  'vip-plan': 50000,
  'elite-multi-asset-plan': 100000,
}

const MINING_PLAN_CATALOG: MiningPlanCatalogItem[] = [
  {
    slug: 'starter-plan',
    basePrice: MINING_PLAN_PRICE_TIERS['starter-plan'],
    durationDays: 1,
    durationLabel: '24 hours',
    features: [
      '2,000 TH/s Hash Rate',
      'SHA-256 Algorithm',
      '24 hour duration cycle',
      'Real-time monitoring',
      'Withdrawals available at plan completion',
    ],
  },
  {
    slug: 'growth-plan',
    basePrice: MINING_PLAN_PRICE_TIERS['growth-plan'],
    durationDays: 2,
    durationLabel: '48 hours',
    features: [
      '6,000 TH/s Hash Rate',
      'Antminer S19 Pro-class routing',
      '48 hour duration cycle',
      'Priority pool routing',
      'Withdrawals available at plan completion',
    ],
  },
  {
    slug: 'standard-plan',
    basePrice: MINING_PLAN_PRICE_TIERS['standard-plan'],
    durationDays: 2,
    durationLabel: '48 hours',
    features: [
      '10,000 TH/s Hash Rate',
      'Antminer S19 XP-class efficiency',
      '48 hour duration cycle',
      'Advanced performance dashboards',
      'Withdrawals available at plan completion',
    ],
  },
  {
    slug: 'pro-plan',
    basePrice: MINING_PLAN_PRICE_TIERS['pro-plan'],
    durationDays: 3,
    durationLabel: '72 hours',
    features: [
      '40,000 TH/s Hash Rate',
      'S21 / S19 XP Hydro-class access',
      '72 hour duration cycle',
      'Intelligent pool optimization',
      'Withdrawals available after 48 hours',
    ],
  },
  {
    slug: 'vip-plan',
    basePrice: MINING_PLAN_PRICE_TIERS['vip-plan'],
    durationDays: 4,
    durationLabel: '96 hours',
    features: [
      '200,000 TH/s Hash Rate',
      'Enterprise ASIC cluster allocation',
      '96 hour duration cycle',
      'Dedicated account management',
      'Withdrawals available after 48 hours',
    ],
  },
  {
    slug: 'elite-multi-asset-plan',
    basePrice: MINING_PLAN_PRICE_TIERS['elite-multi-asset-plan'],
    durationDays: 4,
    durationLabel: '96 hours',
    features: [
      '200,000 TH/s BTC allocation',
      'ETH-equivalent + LTC mining routing',
      '96 hour duration cycle',
      'Enterprise ASIC + GPU clusters',
      'Withdrawals available after 48 hours',
    ],
  },
]

function hasExpectedDurationOnly(
  item: MiningPlanCatalogItem,
  options: Array<{ durationDays: number; durationLabel: string; priceMultiplier: Prisma.Decimal; isDefault: boolean }>
) {
  if (options.length !== 1) return false
  const only = options[0]
  return (
    only.durationDays === item.durationDays &&
    only.durationLabel === item.durationLabel &&
    Number(only.priceMultiplier) === 1 &&
    only.isDefault === true
  )
}

export async function syncMiningPlanCatalog(db: DbClient = prisma) {
  const slugs = MINING_PLAN_CATALOG.map(item => item.slug)
  const plans = await db.plan.findMany({
    where: { slug: { in: slugs } },
    include: {
      durationOptions: true,
      features: { orderBy: { featureOrder: 'asc' } },
    },
  })

  const planMap = new Map(plans.map(plan => [plan.slug, plan]))

  for (const item of MINING_PLAN_CATALOG) {
    const plan = planMap.get(item.slug)
    if (!plan) continue

    if (Number(plan.basePrice) !== item.basePrice) {
      await db.plan.update({
        where: { id: plan.id },
        data: { basePrice: item.basePrice },
      })
    }

    if (!hasExpectedDurationOnly(item, plan.durationOptions)) {
      await db.planDurationOption.deleteMany({ where: { planId: plan.id } })
      await db.planDurationOption.create({
        data: {
          planId: plan.id,
          durationDays: item.durationDays,
          durationLabel: item.durationLabel,
          priceMultiplier: 1.0,
          isDefault: true,
        },
      })
    }

    const currentFeatures = plan.features.map(feature => feature.featureText.trim())
    const targetFeatures = item.features.map(feature => feature.trim())
    const needsFeatureRefresh =
      currentFeatures.length !== targetFeatures.length ||
      currentFeatures.some((feature, index) => feature !== targetFeatures[index])

    if (needsFeatureRefresh) {
      await db.planFeature.deleteMany({ where: { planId: plan.id } })
      await db.planFeature.createMany({
        data: targetFeatures.map((featureText, index) => ({
          planId: plan.id,
          featureText,
          featureOrder: index + 1,
        })),
      })
    }
  }
}
