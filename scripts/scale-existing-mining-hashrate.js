const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const HASHRATE_SCALE = 200
const EPSILON = 1.01

async function main() {
  const shouldApply = process.argv.includes('--apply')

  const activeMiningStats = await prisma.miningStats.findMany({
    where: { isActive: true },
    include: {
      userPlan: {
        include: {
          plan: true,
        },
      },
    },
  })

  let miningStatsUpdated = 0
  for (const stat of activeMiningStats) {
    const baseHashrate = Number(stat.userPlan.plan.baseHashrate)
    const assignedHashrate = Number(stat.assignedHashrate)
    const needsScaling = assignedHashrate <= baseHashrate * EPSILON
    if (!needsScaling) continue

    const scaledHashrate = assignedHashrate * HASHRATE_SCALE
    if (shouldApply) {
      await prisma.miningStats.update({
        where: { id: stat.id },
        data: {
          assignedHashrate: scaledHashrate,
        },
      })
    }
    miningStatsUpdated += 1
  }

  const activeAllocations = await prisma.multiAssetAllocation.findMany({
    where: {
      userPlan: {
        status: 'active',
      },
    },
    include: {
      userPlan: {
        include: {
          plan: true,
        },
      },
    },
  })

  let allocationsUpdated = 0
  for (const allocation of activeAllocations) {
    const baseHashrate = Number(allocation.userPlan.plan.baseHashrate)
    const allocationHashrate = Number(allocation.hashrate)
    const needsScaling = allocationHashrate <= baseHashrate * EPSILON
    if (!needsScaling) continue

    const scaledHashrate = allocationHashrate * HASHRATE_SCALE
    if (shouldApply) {
      await prisma.multiAssetAllocation.update({
        where: { id: allocation.id },
        data: {
          hashrate: scaledHashrate,
        },
      })
    }
    allocationsUpdated += 1
  }

  console.log(
    `${shouldApply ? 'Applied' : 'Planned'} updates - miningStats: ${miningStatsUpdated}, multiAssetAllocations: ${allocationsUpdated}`
  )
  if (!shouldApply) {
    console.log('Dry run only. Re-run with --apply to execute updates.')
  }
}

main()
  .catch(error => {
    console.error('Failed to scale mining hashrate records:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
