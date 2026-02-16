import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ensurePlan = async (slug: string, createData: any) => {
  const existing = await prisma.plan.findUnique({ where: { slug } })
  if (existing) {
    return existing
  }
  return prisma.plan.create(createData)
}

async function main() {
  console.log('Starting database seed...')

  const starterPlan = await ensurePlan('starter-plan', {
    data: {
      name: 'Starter Plan',
      slug: 'starter-plan',
      basePrice: 2000,
      coinType: 'BTC',
      baseHashrate: 10,
      hashrateUnit: 'TH/s',
      algorithm: 'SHA-256',
      hardwareModel: 'Antminer S19 series',
      powerEfficiency: '~34 J/TH',
      maintenanceFeePerUnitDay: 0.003,
      electricityCostPerUnitDay: 0.05,
      uptimeGuarantee: '99.5%',
      status: 'active',
      durationOptions: {
        create: [{ durationDays: 7, durationLabel: '7 days', priceMultiplier: 1.0, isDefault: true }],
      },
      features: {
        create: [
          { featureText: '10 TH/s Hash Rate', featureOrder: 1 },
          { featureText: 'SHA-256 Algorithm', featureOrder: 2 },
          { featureText: '7 day duration cycle', featureOrder: 3 },
          { featureText: 'Real-time monitoring', featureOrder: 4 },
          { featureText: 'Withdrawals available after 48 hours', featureOrder: 5 },
        ],
      },
    },
  })

  const growthPlan = await ensurePlan('growth-plan', {
    data: {
      name: 'Growth Plan',
      slug: 'growth-plan',
      basePrice: 5000,
      coinType: 'BTC',
      baseHashrate: 30,
      hashrateUnit: 'TH/s',
      algorithm: 'SHA-256',
      hardwareModel: 'Antminer S19 Pro',
      powerEfficiency: '~29.5 J/TH',
      maintenanceFeePerUnitDay: 0.0028,
      electricityCostPerUnitDay: 0.048,
      uptimeGuarantee: '99.7%',
      status: 'active',
      durationOptions: {
        create: [{ durationDays: 7, durationLabel: '7 days', priceMultiplier: 1.0, isDefault: true }],
      },
      features: {
        create: [
          { featureText: '30 TH/s Hash Rate', featureOrder: 1 },
          { featureText: 'Antminer S19 Pro', featureOrder: 2 },
          { featureText: '7 day duration cycle', featureOrder: 3 },
          { featureText: 'Priority pool routing', featureOrder: 4 },
          { featureText: 'Withdrawals available after 48 hours', featureOrder: 5 },
        ],
      },
    },
  })

  const standardPlan = await ensurePlan('standard-plan', {
    data: {
      name: 'Standard Plan',
      slug: 'standard-plan',
      basePrice: 10000,
      coinType: 'BTC',
      baseHashrate: 50,
      hashrateUnit: 'TH/s',
      algorithm: 'SHA-256',
      hardwareModel: 'Antminer S19 XP',
      powerEfficiency: '~21.5 J/TH',
      maintenanceFeePerUnitDay: 0.0025,
      electricityCostPerUnitDay: 0.045,
      uptimeGuarantee: '99.8%',
      status: 'active',
      durationOptions: {
        create: [{ durationDays: 7, durationLabel: '7 days', priceMultiplier: 1.0, isDefault: true }],
      },
      features: {
        create: [
          { featureText: '50 TH/s Hash Rate', featureOrder: 1 },
          { featureText: 'Antminer S19 XP', featureOrder: 2 },
          { featureText: '7 day duration cycle', featureOrder: 3 },
          { featureText: 'Advanced performance dashboards', featureOrder: 4 },
          { featureText: 'Withdrawals available after 48 hours', featureOrder: 5 },
        ],
      },
    },
  })

  const proPlan = await ensurePlan('pro-plan', {
    data: {
      name: 'Pro Plan',
      slug: 'pro-plan',
      basePrice: 20000,
      coinType: 'BTC',
      baseHashrate: 200,
      hashrateUnit: 'TH/s',
      algorithm: 'SHA-256',
      hardwareModel: 'Antminer S21 / S19 XP Hydro',
      powerEfficiency: '~17-19 J/TH',
      maintenanceFeePerUnitDay: 0.002,
      electricityCostPerUnitDay: 0.04,
      uptimeGuarantee: '99.9%',
      status: 'active',
      durationOptions: {
        create: [{ durationDays: 7, durationLabel: '7 days', priceMultiplier: 1.0, isDefault: true }],
      },
      features: {
        create: [
          { featureText: '200 TH/s Hash Rate', featureOrder: 1 },
          { featureText: 'Antminer S21 / S19 XP Hydro', featureOrder: 2 },
          { featureText: '7 day duration cycle', featureOrder: 3 },
          { featureText: 'Intelligent pool optimization', featureOrder: 4 },
          { featureText: 'Withdrawals available after 48 hours', featureOrder: 5 },
        ],
      },
    },
  })

  const vipPlan = await ensurePlan('vip-plan', {
    data: {
      name: 'VIP Plan',
      slug: 'vip-plan',
      basePrice: 50000,
      coinType: 'BTC',
      baseHashrate: 1000,
      hashrateUnit: 'TH/s',
      algorithm: 'SHA-256',
      hardwareModel: 'Antminer S21 Hydro / Enterprise ASIC clusters',
      powerEfficiency: '~16-18 J/TH',
      maintenanceFeePerUnitDay: 0.0015,
      electricityCostPerUnitDay: 0.035,
      uptimeGuarantee: '99.95%',
      status: 'active',
      durationOptions: {
        create: [{ durationDays: 7, durationLabel: '7 days', priceMultiplier: 1.0, isDefault: true }],
      },
      features: {
        create: [
          { featureText: '1 PH/s (1,000 TH/s) Hash Rate', featureOrder: 1 },
          { featureText: 'Enterprise ASIC clusters', featureOrder: 2 },
          { featureText: '7 day duration cycle', featureOrder: 3 },
          { featureText: 'Dedicated account manager', featureOrder: 4 },
          { featureText: 'Withdrawals available after 48 hours', featureOrder: 5 },
        ],
      },
    },
  })

  const elitePlan = await ensurePlan('elite-multi-asset-plan', {
    data: {
      name: 'Elite Multi-Asset Plan',
      slug: 'elite-multi-asset-plan',
      basePrice: 100000,
      coinType: 'MULTI',
      baseHashrate: 1000,
      hashrateUnit: 'TH/s',
      algorithm: 'SHA-256 + Ethash + Scrypt',
      hardwareModel: 'Enterprise ASIC + GPU clusters',
      powerEfficiency: '~16-18 J/TH (BTC)',
      maintenanceFeePerUnitDay: 0.0015,
      electricityCostPerUnitDay: 0.035,
      uptimeGuarantee: '99.95%',
      status: 'active',
      durationOptions: {
        create: [{ durationDays: 7, durationLabel: '7 days', priceMultiplier: 1.0, isDefault: true }],
      },
      features: {
        create: [
          { featureText: '1 PH/s BTC (SHA-256)', featureOrder: 1 },
          { featureText: 'ETH-equivalent & LTC mining allocation', featureOrder: 2 },
          { featureText: 'Enterprise ASIC + GPU clusters', featureOrder: 3 },
          { featureText: '7 day duration cycle', featureOrder: 4 },
          { featureText: 'Withdrawals available after 48 hours', featureOrder: 5 },
        ],
      },
    },
  })

  const tradingPlans = await prisma.tradingPlan.createMany({
    data: [
      {
        name: 'Mega Cloud Pack',
        slug: 'mega-cloud-pack',
        minInvestmentUsd: 2000,
        maxInvestmentUsd: 9999,
        minDurationHours: 35,
        maxDurationHours: 48,
        minReturnMultiplier: 2.12,
        maxReturnMultiplier: 2.78,
        status: 'active',
      },
      {
        name: 'Top Premium Package',
        slug: 'top-premium-package',
        minInvestmentUsd: 10000,
        maxInvestmentUsd: 49999,
        minDurationHours: 48,
        maxDurationHours: 72,
        minReturnMultiplier: 2.25,
        maxReturnMultiplier: 2.75,
        status: 'active',
      },
      {
        name: 'VIP Promo Pack',
        slug: 'vip-promo-pack',
        minInvestmentUsd: 50000,
        maxInvestmentUsd: 9999999,
        minDurationHours: 72,
        maxDurationHours: 96,
        minReturnMultiplier: 2.35,
        maxReturnMultiplier: 2.8,
        status: 'active',
      },
    ],
    skipDuplicates: true,
  })

  console.log('Created 6 plans successfully!')
  console.log('Created trading plans:', tradingPlans.count)
  console.log('Starter Plan ID:', starterPlan.id)
  console.log('Growth Plan ID:', growthPlan.id)
  console.log('Standard Plan ID:', standardPlan.id)
  console.log('Pro Plan ID:', proPlan.id)
  console.log('VIP Plan ID:', vipPlan.id)
  console.log('Elite Plan ID:', elitePlan.id)
}

main()
  .catch(e => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
