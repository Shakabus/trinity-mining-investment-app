import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // 1. STARTER PLAN
  const starterPlan = await prisma.plan.create({
    data: {
      name: 'Starter Plan',
      slug: 'starter-plan',
      basePrice: 50,
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
        create: [
          { durationDays: 30, durationLabel: '30 days', priceMultiplier: 1.0, isDefault: true },
          { durationDays: 60, durationLabel: '60 days', priceMultiplier: 1.8 },
          { durationDays: 90, durationLabel: '90 days', priceMultiplier: 2.5 },
        ],
      },
      features: {
        create: [
          { featureText: '10 TH/s Hash Rate', featureOrder: 1 },
          { featureText: 'SHA-256 Algorithm', featureOrder: 2 },
          { featureText: '30 / 60 / 90 day duration', featureOrder: 3 },
          { featureText: 'Real-time monitoring', featureOrder: 4 },
          { featureText: 'Daily automated payouts', featureOrder: 5 },
        ],
      },
    },
  })

  // 2. GROWTH PLAN
  const growthPlan = await prisma.plan.create({
    data: {
      name: 'Growth Plan',
      slug: 'growth-plan',
      basePrice: 120,
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
        create: [
          { durationDays: 90, durationLabel: '90 days', priceMultiplier: 1.0, isDefault: true },
          { durationDays: 180, durationLabel: '180 days', priceMultiplier: 1.9 },
        ],
      },
      features: {
        create: [
          { featureText: '30 TH/s Hash Rate', featureOrder: 1 },
          { featureText: 'Antminer S19 Pro', featureOrder: 2 },
          { featureText: '90 / 180 day duration', featureOrder: 3 },
          { featureText: 'Priority pool routing', featureOrder: 4 },
          { featureText: 'Enhanced reporting metrics', featureOrder: 5 },
        ],
      },
    },
  })

  // 3. STANDARD PLAN
  const standardPlan = await prisma.plan.create({
    data: {
      name: 'Standard Plan',
      slug: 'standard-plan',
      basePrice: 200,
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
        create: [
          { durationDays: 180, durationLabel: '180 days', priceMultiplier: 1.0, isDefault: true },
          { durationDays: 365, durationLabel: '1 year', priceMultiplier: 1.8 },
        ],
      },
      features: {
        create: [
          { featureText: '50 TH/s Hash Rate', featureOrder: 1 },
          { featureText: 'Antminer S19 XP', featureOrder: 2 },
          { featureText: '180 / 365 day duration', featureOrder: 3 },
          { featureText: '+10% renewal bonus', featureOrder: 4 },
          { featureText: 'Advanced performance dashboards', featureOrder: 5 },
        ],
      },
    },
  })

  // 4. PRO PLAN
  const proPlan = await prisma.plan.create({
    data: {
      name: 'Pro Plan',
      slug: 'pro-plan',
      basePrice: 800,
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
        create: [
          { durationDays: 365, durationLabel: '1 year', priceMultiplier: 1.0, isDefault: true },
          { durationDays: 730, durationLabel: '2 years', priceMultiplier: 1.9 },
          { durationDays: 1095, durationLabel: '3 years', priceMultiplier: 2.7 },
        ],
      },
      features: {
        create: [
          { featureText: '200 TH/s Hash Rate', featureOrder: 1 },
          { featureText: 'Antminer S21 / S19 XP Hydro', featureOrder: 2 },
          { featureText: '1 / 2 / 3 year duration', featureOrder: 3 },
          { featureText: 'Intelligent pool optimization', featureOrder: 4 },
          { featureText: 'Priority payout processing', featureOrder: 5 },
        ],
      },
    },
  })

  // 5. VIP PLAN
  const vipPlan = await prisma.plan.create({
    data: {
      name: 'VIP Plan',
      slug: 'vip-plan',
      basePrice: 5000,
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
        create: [
          { durationDays: 730, durationLabel: '2 years', priceMultiplier: 1.0, isDefault: true },
          { durationDays: 1095, durationLabel: '3 years', priceMultiplier: 1.4 },
          { durationDays: 1825, durationLabel: '5 years', priceMultiplier: 2.2 },
        ],
      },
      features: {
        create: [
          { featureText: '1 PH/s (1,000 TH/s) Hash Rate', featureOrder: 1 },
          { featureText: 'Enterprise ASIC clusters', featureOrder: 2 },
          { featureText: 'Custom 2–5 year duration', featureOrder: 3 },
          { featureText: 'Dedicated account manager', featureOrder: 4 },
          { featureText: 'SLA-backed uptime', featureOrder: 5 },
        ],
      },
    },
  })

  // 6. ELITE MULTI-ASSET PLAN
  const elitePlan = await prisma.plan.create({
    data: {
      name: 'Elite Multi-Asset Plan',
      slug: 'elite-multi-asset-plan',
      basePrice: 12000,
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
        create: [
          { durationDays: 730, durationLabel: '2 years', priceMultiplier: 1.0, isDefault: true },
          { durationDays: 1095, durationLabel: '3 years', priceMultiplier: 1.4 },
          { durationDays: 1825, durationLabel: '5 years', priceMultiplier: 2.2 },
        ],
      },
      features: {
        create: [
          { featureText: '1 PH/s BTC (SHA-256)', featureOrder: 1 },
          { featureText: 'ETH-equivalent & LTC mining allocation', featureOrder: 2 },
          { featureText: 'Enterprise ASIC + GPU clusters', featureOrder: 3 },
          { featureText: 'Custom 2–5 year duration', featureOrder: 4 },
          { featureText: 'Priority payouts & reporting', featureOrder: 5 },
        ],
      },
    },
  })

  console.log('✅ Created 6 plans successfully!')
  console.log('✅ Starter Plan ID:', starterPlan.id)
  console.log('✅ Growth Plan ID:', growthPlan.id)
  console.log('✅ Standard Plan ID:', standardPlan.id)
  console.log('✅ Pro Plan ID:', proPlan.id)
  console.log('✅ VIP Plan ID:', vipPlan.id)
  console.log('✅ Elite Plan ID:', elitePlan.id)
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })