import { prisma } from '@/lib/db'
import type { Prisma, PrismaClient } from '@prisma/client'

type DbClient = PrismaClient | Prisma.TransactionClient

type MiningPlanCatalogItem = {
  slug: string
  basePrice: number
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

const ONE_WEEK_DURATION = {
  durationDays: 7,
  durationLabel: '7 days',
  priceMultiplier: 1.0,
  isDefault: true,
}

const MINING_PLAN_CATALOG: MiningPlanCatalogItem[] = [
  {
    slug: 'starter-plan',
    basePrice: MINING_PLAN_PRICE_TIERS['starter-plan'],
    features: [
      '2,000 TH/s Hash Rate',
      'SHA-256 Algorithm',
      '7 day duration cycle',
      'Real-time monitoring',
      'Withdrawals available after 48 hours',
    ],
  },
  {
    slug: 'growth-plan',
    basePrice: MINING_PLAN_PRICE_TIERS['growth-plan'],
    features: [
      '6,000 TH/s Hash Rate',
      'Antminer S19 Pro-class routing',
      '7 day duration cycle',
      'Priority pool routing',
      'Withdrawals available after 48 hours',
    ],
  },
  {
    slug: 'standard-plan',
    basePrice: MINING_PLAN_PRICE_TIERS['standard-plan'],
    features: [
      '10,000 TH/s Hash Rate',
      'Antminer S19 XP-class efficiency',
      '7 day duration cycle',
      'Advanced performance dashboards',
      'Withdrawals available after 48 hours',
    ],
  },
  {
    slug: 'pro-plan',
    basePrice: MINING_PLAN_PRICE_TIERS['pro-plan'],
    features: [
      '40,000 TH/s Hash Rate',
      'S21 / S19 XP Hydro-class access',
      '7 day duration cycle',
      'Intelligent pool optimization',
      'Withdrawals available after 48 hours',
    ],
  },
  {
    slug: 'vip-plan',
    basePrice: MINING_PLAN_PRICE_TIERS['vip-plan'],
    features: [
      '200,000 TH/s Hash Rate',
      'Enterprise ASIC cluster allocation',
      '7 day duration cycle',
      'Dedicated account management',
      'Withdrawals available after 48 hours',
    ],
  },
  {
    slug: 'elite-multi-asset-plan',
    basePrice: MINING_PLAN_PRICE_TIERS['elite-multi-asset-plan'],
    features: [
      '200,000 TH/s BTC allocation',
      'ETH-equivalent + LTC mining routing',
      '7 day duration cycle',
      'Enterprise ASIC + GPU clusters',
      'Withdrawals available after 48 hours',
    ],
  },
]

function hasOneWeekDurationOnly(
  options: Array<{ durationDays: number; durationLabel: string; priceMultiplier: Prisma.Decimal; isDefault: boolean }>
) {
  if (options.length !== 1) return false
  const only = options[0]
  return (
    only.durationDays === ONE_WEEK_DURATION.durationDays &&
    only.durationLabel === ONE_WEEK_DURATION.durationLabel &&
    Number(only.priceMultiplier) === ONE_WEEK_DURATION.priceMultiplier &&
    only.isDefault === ONE_WEEK_DURATION.isDefault
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

    if (!hasOneWeekDurationOnly(plan.durationOptions)) {
      await db.planDurationOption.deleteMany({ where: { planId: plan.id } })
      await db.planDurationOption.create({
        data: {
          planId: plan.id,
          durationDays: ONE_WEEK_DURATION.durationDays,
          durationLabel: ONE_WEEK_DURATION.durationLabel,
          priceMultiplier: ONE_WEEK_DURATION.priceMultiplier,
          isDefault: ONE_WEEK_DURATION.isDefault,
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
