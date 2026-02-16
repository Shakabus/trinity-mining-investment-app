import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import MiningDashboard from '@/components/dashboard/MiningDashboard'
import { translate, languageFromCurrency, type LanguageCode } from '@/lib/i18n'
import { getFxRates, isSupportedCurrency, type CurrencyCode } from '@/lib/forex'
import Link from 'next/link'
import {
  computeDailyCryptoEstimate,
  computeEarningsIncrement,
  computeShareRatePerSecond,
  getMiningDailyYieldPerTh,
  normalizeHashrateToTH,
} from '@/lib/mining-engine'
import {
  buildChartSampleOffsets,
  buildCycleSegments,
  formatCycleProgressLabel,
  resolveChartWindowHours,
  resolveElapsedPlanHours,
  resolvePlanDurationHours,
} from '@/lib/mining-chart'

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function hashStringToSeed(value: string) {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function computeHashrate(assignedHashrate: number, seed: number, when: Date) {
  const bucket = Math.floor(when.getTime() / (1000 * 60 * 30))
  const noise = seededRandom(seed + bucket * 17)
  const variance = 0.92 + noise * 0.08
  return Math.min(assignedHashrate, assignedHashrate * variance)
}

export default async function MiningPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      miningStats: {
        include: {
          userPlan: {
            include: {
              plan: true,
              multiAssetAllocations: true,
              earnings: {
                where: { isActive: true }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 1
      },
      earnings: {
        where: { isActive: true },
        include: {
          userPlan: {
            include: {
              plan: true,
            },
          },
        },
      },
    }
  })

  if (!user) {
    redirect('/sign-in')
  }

  const rates = await getFxRates()
  const preferredCurrency: CurrencyCode = isSupportedCurrency(user?.preferredCurrency || '')
    ? (user?.preferredCurrency as CurrencyCode)
    : 'USD'
  const preferredLanguage: LanguageCode = user?.preferredLanguage
    ? (user?.preferredLanguage as LanguageCode)
    : languageFromCurrency(preferredCurrency)
  const t = (key: string) => translate(key, preferredLanguage)

  const miningStats = user.miningStats[0]

  // If no active mining
  if (!miningStats || user.accountStatus !== 'active') {
    return (
      <div className="max-w-4xl mx-auto px-2 sm:px-4 lg:px-6 py-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{t('miningTitle')}</h1>
            <p className="text-white/70">{t('miningSubtitle')}</p>
          </div>

          <div 
            className="p-12 md:p-16 rounded-3xl text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
            }}
          >
            <div className="text-6xl mb-6">⛏️</div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">{t('miningNotActiveTitle')}</h2>
            <p className="text-white/70 mb-8 max-w-md mx-auto">
              {user.accountStatus === 'pending' 
                ? t('miningPendingBody')
                : t('miningSelectPlanBody')}
            </p>
            <Link
              href={user.accountStatus === 'pending' ? '/dashboard/payment' : '/dashboard/plans'}
              className="inline-block px-8 py-4 rounded-full font-semibold transition-all text-lg"
              style={{
                background: 'linear-gradient(135deg, #582dff, #3a137a)',
                color: '#ffffff',
                boxShadow: '0 4px 24px rgba(88, 45, 255, 0.4)',
              }}
            >
              {user.accountStatus === 'pending' ? t('viewPaymentStatus') : t('browsePlans')} →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const now = new Date()

  // Convert Decimals to numbers
  const assignedHashrate = parseFloat(miningStats.assignedHashrate.toString())
  const uptimePercentage = parseFloat(miningStats.uptimePercentage.toString())
  const uptimeFactor = Math.min(1, Math.max(0.9, uptimePercentage / 100))
  const isMiningActive = miningStats.isActive
  const currentHashrate = isMiningActive ? computeHashrate(assignedHashrate, miningStats.id, now) : 0
  const performanceFactor = assignedHashrate > 0 ? currentHashrate / assignedHashrate : 0
  const hashrateTH = normalizeHashrateToTH(assignedHashrate, miningStats.hashrateUnit)
  const shareRatePerSecond = isMiningActive
    ? computeShareRatePerSecond({ hashrateTH, uptimeFactor, performanceFactor })
    : 0
  const nowBucketSeed = Math.floor(now.getTime() / (1000 * 60 * 10))
  const latencyMs = Math.round(30 + seededRandom(miningStats.id + nowBucketSeed) * 70)

  const lastShareUpdate = miningStats.updatedAt ?? miningStats.createdAt
  const elapsedShareSeconds = Math.max(0, (now.getTime() - lastShareUpdate.getTime()) / 1000)
  const shareIncrement = Math.floor(elapsedShareSeconds * shareRatePerSecond)
  const baseShares = parseFloat(miningStats.lastCounterValue.toString())
  const validShares = baseShares + shareIncrement

  if (isMiningActive && shareIncrement > 0) {
    await prisma.miningStats.update({
      where: { id: miningStats.id },
      data: {
        lastCounterValue: validShares,
      },
    })
  }

  const shareSeed = miningStats.id + 91
  const staleRate = 0.01 + seededRandom(shareSeed) * 0.03
  const invalidRate = 0.002 + seededRandom(shareSeed + 3) * 0.004

  const startDate = miningStats.userPlan.startDate ?? miningStats.createdAt ?? now
  const planDurationHours = resolvePlanDurationHours(miningStats.userPlan.selectedDurationDays)
  const elapsedPlanHours = Math.min(planDurationHours, resolveElapsedPlanHours(startDate, now))
  const chartWindowHours = resolveChartWindowHours(planDurationHours, elapsedPlanHours)
  const recentWindowHours = Math.min(planDurationHours, 24)

  const staleShares = Math.round(validShares * staleRate)
  const invalidShares = Math.round(validShares * invalidRate)
  const lastHourShares = Math.round(shareRatePerSecond * 3600)
  const lastDayShares = Math.round(shareRatePerSecond * recentWindowHours * 3600)
  const lastHourStale = Math.round(lastHourShares * staleRate)
  const lastHourInvalid = Math.round(lastHourShares * invalidRate)
  const lastDayStale = Math.round(lastDayShares * staleRate)
  const lastDayInvalid = Math.round(lastDayShares * invalidRate)

  const estimatedSecondsPerShare = shareRatePerSecond > 0 ? 1 / shareRatePerSecond : 0
  const activeRigs = Math.max(1, Math.round(hashrateTH / 20))
  const offlineRigs = Math.round(activeRigs * (1 - uptimeFactor))
  const onlineRigs = Math.max(0, activeRigs - offlineRigs)
  const wattsPerTH = 30 - uptimeFactor * 2
  const powerKw = Math.round((hashrateTH * wattsPerTH) / 100) / 10
  const tempSeed = seededRandom(miningStats.id + Math.floor(now.getTime() / (1000 * 60 * 60)))
  const temperatureC = Math.round(54 + tempSeed * 18 + (1 - uptimeFactor) * 8)
  const difficultySeed = seededRandom(miningStats.id + Math.floor(now.getTime() / (1000 * 60 * 60 * 12)))
  const difficultyChange = Math.round((difficultySeed * 2 - 1) * 2 * 100) / 100

  const miningStartMs = startDate.getTime()
  const hourlyOffsets = buildChartSampleOffsets(chartWindowHours, 24)
  const hourlyHashrate = hourlyOffsets.map(offset => {
    const hoursAgo = chartWindowHours - offset
    const sampleTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000)
    const elapsedAtSample = Math.max(0, (sampleTime.getTime() - miningStartMs) / (1000 * 60 * 60))
    const hashrate = isMiningActive ? computeHashrate(assignedHashrate, miningStats.id, sampleTime) : 0
    return {
      time: formatCycleProgressLabel(elapsedAtSample, planDurationHours),
      hashrate: Math.round(hashrate * 100) / 100,
    }
  })

  const shareSegments = buildCycleSegments(chartWindowHours, 8)
  const weeklyPerformance = shareSegments.map(segment => {
    const segmentHours = Math.max(1 / 6, segment.endHour - segment.startHour)
    const hoursAgoAtMidpoint = chartWindowHours - segment.midHour
    const sampleTime = new Date(now.getTime() - hoursAgoAtMidpoint * 60 * 60 * 1000)
    const elapsedAtEnd = Math.max(
      0,
      Math.min(planDurationHours, (sampleTime.getTime() - miningStartMs) / (1000 * 60 * 60) + segmentHours / 2)
    )
    const avgHashrate = isMiningActive ? computeHashrate(assignedHashrate, miningStats.id + 37, sampleTime) : 0
    const segmentPerformanceFactor = assignedHashrate > 0 ? avgHashrate / assignedHashrate : 0
    const segmentShares = isMiningActive
      ? Math.round(
          computeShareRatePerSecond({
            hashrateTH,
            uptimeFactor,
            performanceFactor: segmentPerformanceFactor,
          }) *
            segmentHours *
            3600
        )
      : 0

    return {
      day: formatCycleProgressLabel(elapsedAtEnd, planDurationHours),
      averageHashrate: Math.round(avgHashrate * 100) / 100,
      validShares: segmentShares,
    }
  })

  const isMultiAsset = miningStats.userPlan.plan.coinType === 'MULTI'
  const assetStats: {
    coinType: string
    assignedHashrate: number
    hashrateUnit: string
    currentHashrate: number
    totalEarnedCrypto: number
    estimatedDailyCrypto: number
  }[] = []

  if (isMultiAsset) {
    let allocations = miningStats.userPlan.multiAssetAllocations

    if (allocations.length === 0) {
      const allocationSplits = [
        { coinType: 'BTC', ratio: 0.6, algorithm: 'SHA-256', hardwareModel: 'Antminer S21 Hydro' },
        { coinType: 'ETH', ratio: 0.25, algorithm: 'Ethash', hardwareModel: 'Enterprise GPU Cluster' },
        { coinType: 'LTC', ratio: 0.15, algorithm: 'Scrypt', hardwareModel: 'Antminer L7' },
      ]

      allocations = await Promise.all(
        allocationSplits.map(split =>
          prisma.multiAssetAllocation.create({
            data: {
              userPlanId: miningStats.userPlanId,
              coinType: split.coinType,
              hashrate: assignedHashrate * split.ratio,
              hashrateUnit: miningStats.hashrateUnit,
              algorithm: split.algorithm,
              hardwareModel: split.hardwareModel,
              maintenanceFee: miningStats.userPlan.plan.maintenanceFeePerUnitDay,
              electricityCost: miningStats.userPlan.plan.electricityCostPerUnitDay,
            },
          })
        )
      )
    }

    for (const allocation of allocations) {
      let earningsRecord = miningStats.userPlan.earnings.find(
        record => record.coinType === allocation.coinType && record.isActive
      )

      if (!earningsRecord) {
        earningsRecord = await prisma.earnings.create({
          data: {
            userId: miningStats.userId,
            userPlanId: miningStats.userPlanId,
            coinType: allocation.coinType,
            dailyEstimateUsd: 0,
            dailyEstimateCrypto: 0,
            totalEarnedUsd: 0,
            totalEarnedCrypto: 0,
            lastCalculatedAt: miningStats.userPlan.startDate ?? miningStats.createdAt ?? now,
            isActive: true,
          },
        })
        miningStats.userPlan.earnings.push(earningsRecord)
      }

      const allocationHashrate = parseFloat(allocation.hashrate.toString())
      const allocationSeed = miningStats.id + hashStringToSeed(allocation.coinType)
      const allocationCurrentHashrate = computeHashrate(allocationHashrate, allocationSeed, now)
      const allocationPerformance =
        allocationHashrate > 0 ? allocationCurrentHashrate / allocationHashrate : 1
      const lastCalculatedAt =
        earningsRecord.lastCalculatedAt ?? miningStats.userPlan.startDate ?? miningStats.createdAt ?? now
      const elapsedSeconds = Math.max(0, (now.getTime() - lastCalculatedAt.getTime()) / 1000)
      const earnedIncrement = isMiningActive && !earningsRecord.isAdminOverride
        ? computeEarningsIncrement({
            coinType: allocation.coinType,
            assignedHashrate: allocationHashrate,
            unit: allocation.hashrateUnit,
            performanceFactor: allocationPerformance,
            elapsedSeconds,
            dailyEstimateCryptoOverride: parseFloat(earningsRecord.dailyEstimateCrypto.toString()),
          })
        : 0
      const totalEarnedCrypto = parseFloat(earningsRecord.totalEarnedCrypto.toString()) + earnedIncrement
      const estimateCrypto = parseFloat(earningsRecord.dailyEstimateCrypto.toString())
      const estimateUsd = parseFloat(earningsRecord.dailyEstimateUsd.toString())
      const effectivePrice = estimateCrypto > 0 ? estimateUsd / estimateCrypto : 0
      const totalEarnedUsd =
        effectivePrice > 0
          ? totalEarnedCrypto * effectivePrice
          : parseFloat(earningsRecord.totalEarnedUsd.toString())
      const estimatedDailyCrypto = (() => {
        const recordEstimate = parseFloat(earningsRecord.dailyEstimateCrypto.toString())
        if (recordEstimate > 0) {
          return recordEstimate
        }
        const hashrateTH = normalizeHashrateToTH(allocationHashrate, allocation.hashrateUnit)
        const yieldPerTh = getMiningDailyYieldPerTh(allocation.coinType)
        return hashrateTH * yieldPerTh
      })()

      if (isMiningActive && elapsedSeconds > 0 && !earningsRecord.isAdminOverride) {
        await prisma.earnings.update({
          where: { id: earningsRecord.id },
          data: {
            totalEarnedCrypto,
            totalEarnedUsd,
            lastCalculatedAt: now,
            lastUsdUpdateAt: now,
          },
        })
      }

      assetStats.push({
        coinType: allocation.coinType,
        assignedHashrate: allocationHashrate,
        hashrateUnit: allocation.hashrateUnit,
        currentHashrate: allocationCurrentHashrate,
        totalEarnedCrypto,
        estimatedDailyCrypto,
      })
    }
  }

  let totalEarnedCrypto = 0
  let estimatedDailyCrypto = 0

  if (!isMultiAsset) {
    let earningsRecord = miningStats.userPlan.earnings.find(record => record.isActive)

    if (!earningsRecord) {
      earningsRecord = await prisma.earnings.create({
        data: {
          userId: miningStats.userId,
          userPlanId: miningStats.userPlanId,
          coinType: miningStats.userPlan.plan.coinType,
          dailyEstimateUsd: 0,
          dailyEstimateCrypto: 0,
          totalEarnedUsd: 0,
          totalEarnedCrypto: 0,
          lastCalculatedAt: miningStats.userPlan.startDate ?? miningStats.createdAt ?? now,
          isActive: true,
        },
      })
      miningStats.userPlan.earnings.push(earningsRecord)
    }

    const lastCalculatedAt =
      earningsRecord.lastCalculatedAt ?? miningStats.userPlan.startDate ?? miningStats.createdAt ?? now
    const elapsedSeconds = Math.max(0, (now.getTime() - lastCalculatedAt.getTime()) / 1000)
    const earnedIncrement = isMiningActive && !earningsRecord.isAdminOverride
      ? computeEarningsIncrement({
          coinType: miningStats.userPlan.plan.coinType,
          assignedHashrate,
          unit: miningStats.hashrateUnit,
          performanceFactor,
          elapsedSeconds,
          dailyEstimateCryptoOverride: parseFloat(earningsRecord.dailyEstimateCrypto.toString()),
        })
      : 0
    totalEarnedCrypto = parseFloat(earningsRecord.totalEarnedCrypto.toString()) + earnedIncrement
    const estimateCrypto = parseFloat(earningsRecord.dailyEstimateCrypto.toString())
    const estimateUsd = parseFloat(earningsRecord.dailyEstimateUsd.toString())
    const effectivePrice = estimateCrypto > 0 ? estimateUsd / estimateCrypto : 0
    const totalEarnedUsd =
      effectivePrice > 0
        ? totalEarnedCrypto * effectivePrice
        : parseFloat(earningsRecord.totalEarnedUsd.toString())
    estimatedDailyCrypto = (() => {
      const recordEstimate = parseFloat(earningsRecord.dailyEstimateCrypto.toString())
      if (recordEstimate > 0) {
        return recordEstimate
      }
      return computeDailyCryptoEstimate(
        miningStats.userPlan.plan.coinType,
        assignedHashrate,
        miningStats.hashrateUnit
      )
    })()

    if (isMiningActive && elapsedSeconds > 0 && !earningsRecord.isAdminOverride) {
      await prisma.earnings.update({
        where: { id: earningsRecord.id },
        data: {
          totalEarnedCrypto,
          totalEarnedUsd,
          lastCalculatedAt: now,
          lastUsdUpdateAt: now,
        },
      })
    }
  }

  const historicalEarnings = user.earnings
    .filter(record => record.isHistorical)
    .map(record => ({
      id: record.id,
      planName: record.userPlan?.plan?.name ?? 'Previous Plan',
      coinType: record.coinType,
      totalEarnedCrypto: parseFloat(record.totalEarnedCrypto.toString()),
      totalEarnedUsd: parseFloat(record.totalEarnedUsd.toString()),
      isWithdrawable: record.isWithdrawable,
    }))

  const miningData = {
    id: miningStats.id,
    assignedHashrate,
    hashrateUnit: miningStats.hashrateUnit,
    algorithm: miningStats.algorithm,
    miningPool: miningStats.miningPool,
    dataCenterLocation: miningStats.dataCenterLocation,
    machineModel: miningStats.machineModel,
    uptimePercentage,
    planName: miningStats.userPlan.plan.name,
    coinType: miningStats.userPlan.plan.coinType,
    startDate: startDate,
    planDurationHours,
    elapsedPlanHours,
    chartWindowHours,
    currentHashrate,
    validShares,
    staleShares,
    invalidShares,
    lastHourShares,
    lastHourStale,
    lastHourInvalid,
    lastDayShares,
    lastDayStale,
    lastDayInvalid,
    latencyMs,
    estimatedSecondsPerShare,
    workerStatus: {
      total: activeRigs,
      online: onlineRigs,
      offline: offlineRigs,
    },
    powerKw,
    temperatureC,
    difficultyChange,
    totalEarnedCrypto,
    estimatedDailyCrypto: isMultiAsset
      ? assetStats.reduce((sum, item) => sum + item.estimatedDailyCrypto, 0)
      : estimatedDailyCrypto,
    hourlyHashrate,
    weeklyPerformance,
    assetStats: assetStats.length > 0 ? assetStats : undefined,
    isMiningActive,
    historicalEarnings,
  }

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-6">
      <MiningDashboard mining={miningData} />
    </div>
  )
}
