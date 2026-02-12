const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const DAILY_YIELD_PER_TH = {
  BTC: 0.00000022,
  ETH: 0.0000035,
  LTC: 0.000015,
}

const HASHRATE_UNIT_FACTORS = {
  'PH/s': 1000,
  'TH/s': 1,
  'GH/s': 1 / 1000,
  'MH/s': 1 / 1_000_000,
  'KH/s': 1 / 1_000_000_000,
}

const MULTI_ASSET_SPLIT = {
  BTC: 0.6,
  ETH: 0.25,
  LTC: 0.15,
}

function normalizeHashrateToTH(hashrate, unit) {
  return hashrate * (HASHRATE_UNIT_FACTORS[unit] ?? 1)
}

function computeDailyEstimate(coinType, hashrate, unit) {
  const hashrateTH = normalizeHashrateToTH(hashrate, unit)
  const yieldPerTh = DAILY_YIELD_PER_TH[coinType] ?? DAILY_YIELD_PER_TH.BTC
  return hashrateTH * yieldPerTh
}

async function main() {
  const shouldApply = process.argv.includes('--apply')

  const records = await prisma.earnings.findMany({
    where: {
      isActive: true,
      isAdminOverride: false,
      userPlan: {
        status: 'active',
      },
    },
    include: {
      userPlan: {
        include: {
          plan: true,
          miningStats: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          multiAssetAllocations: true,
        },
      },
    },
  })

  let touched = 0
  for (const record of records) {
    const plan = record.userPlan.plan
    const baseHashrate = Number(plan.baseHashrate)
    if (baseHashrate <= 0) continue

    let currentHashrate = 0
    let hashrateUnit = plan.hashrateUnit
    let factor = 1

    if (plan.coinType === 'MULTI') {
      const allocation = record.userPlan.multiAssetAllocations.find(
        item => item.coinType === record.coinType
      )
      if (!allocation) continue

      const split = MULTI_ASSET_SPLIT[record.coinType] ?? 1
      const expectedBaseAllocation = baseHashrate * split
      currentHashrate = Number(allocation.hashrate)
      hashrateUnit = allocation.hashrateUnit
      factor = expectedBaseAllocation > 0 ? currentHashrate / expectedBaseAllocation : 1
    } else {
      const activeStat = record.userPlan.miningStats[0]
      if (!activeStat) continue

      currentHashrate = Number(activeStat.assignedHashrate)
      hashrateUnit = activeStat.hashrateUnit
      factor = currentHashrate / baseHashrate
    }

    if (factor <= 1.01) continue

    const expectedDailyCrypto = computeDailyEstimate(record.coinType, currentHashrate, hashrateUnit)
    const currentDailyCrypto = Number(record.dailyEstimateCrypto)
    const currentDailyUsd = Number(record.dailyEstimateUsd)
    const currentTotalCrypto = Number(record.totalEarnedCrypto)
    const currentTotalUsd = Number(record.totalEarnedUsd)

    // Avoid re-scaling records already aligned with scaled hashrate.
    const needsNormalization =
      currentDailyCrypto <= 0 || currentDailyCrypto < expectedDailyCrypto * 0.35
    if (!needsNormalization) continue

    const updatedDailyCrypto = expectedDailyCrypto
    const updatedDailyUsd = currentDailyUsd > 0 ? currentDailyUsd * factor : currentDailyUsd
    const updatedTotalCrypto = currentTotalCrypto > 0 ? currentTotalCrypto * factor : currentTotalCrypto
    const updatedTotalUsd = currentTotalUsd > 0 ? currentTotalUsd * factor : currentTotalUsd

    if (shouldApply) {
      await prisma.earnings.update({
        where: { id: record.id },
        data: {
          dailyEstimateCrypto: updatedDailyCrypto,
          dailyEstimateUsd: updatedDailyUsd,
          totalEarnedCrypto: updatedTotalCrypto,
          totalEarnedUsd: updatedTotalUsd,
          lastEstimateUpdateAt: new Date(),
          lastUsdUpdateAt: new Date(),
        },
      })
    }

    touched += 1
  }

  console.log(`${shouldApply ? 'Applied' : 'Planned'} earnings normalization for ${touched} records.`)
  if (!shouldApply) {
    console.log('Dry run only. Re-run with --apply to execute updates.')
  }
}

main()
  .catch(error => {
    console.error('Failed to normalize mining earnings:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
