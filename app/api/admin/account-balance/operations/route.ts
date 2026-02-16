import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/db'
import { scalePlanHashrateDecimal } from '@/lib/mining-hashrate'
import { getCryptoPricesUsd } from '@/lib/earnings'
import { computeTargetDailyCryptoEstimate } from '@/lib/mining-engine'
import {
  ACCOUNT_BALANCE_ENTRY_ACTION,
  createAccountBalanceEntry,
  getAccountBalanceSummary,
  parseAccountBalanceEntryDetail,
  type AccountBalanceDirection,
} from '@/lib/account-balance'
import {
  convertUsdToCoin,
  getTrackedCryptoPricesUsd,
  isTrackedAssetCoin,
  type TrackedAssetCoin,
} from '@/lib/crypto-prices'
import {
  isInputValidationError,
  readJsonObject,
  readNumberField,
  readStringField,
} from '@/lib/requestValidation'
import { logUserActivity } from '@/lib/user-activity'

const ACCOUNT_BALANCE_OPERATION_FIELDS = ['source', 'referenceId', 'decision', 'note'] as const
const ACCOUNT_BALANCE_MANUAL_CREATE_FIELDS = [
  'userId',
  'adjustmentType',
  'amountUsd',
  'coinType',
  'paymentMethod',
  'note',
] as const
const ACCOUNT_BALANCE_MANUAL_DELETE_FIELDS = ['entryId', 'reason'] as const
const REVIEWABLE_SOURCES = [
  'funding_deposit',
  'mining_plan_purchase',
  'trading_plan_purchase',
  'real_estate_buy_in',
  'account_balance_withdrawal',
] as const
const MANUAL_ADJUSTMENT_TYPES = ['deposit', 'withdrawal'] as const
const DEFAULT_REFERRAL_SETTINGS = {
  isEnabled: true,
  bonusPercent: 5,
  minPaymentUsd: 100,
}

type ReviewableSource = (typeof REVIEWABLE_SOURCES)[number]
type ManualAdjustmentType = (typeof MANUAL_ADJUSTMENT_TYPES)[number]

class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const isReviewableSource = (value: string): value is ReviewableSource =>
  REVIEWABLE_SOURCES.includes(value as ReviewableSource)

const isManualAdjustmentType = (value: string): value is ManualAdjustmentType =>
  MANUAL_ADJUSTMENT_TYPES.includes(value as ManualAdjustmentType)

const directionForSource = (source: ReviewableSource): AccountBalanceDirection =>
  source === 'funding_deposit' ? 'credit' : 'debit'

async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) return null

  const adminUser = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: { id: true, role: true },
  })

  if (!adminUser || adminUser.role !== 'admin') return null
  return adminUser
}

async function getLatestOperationEntry(source: ReviewableSource, referenceId: string) {
  const expectedDirection = directionForSource(source)
  const logs = await prisma.userActivityLog.findMany({
    where: {
      action: 'AccountBalanceEntry',
      AND: [
        { detail: { contains: `"source":"${source}"` } },
        { detail: { contains: `"referenceId":"${referenceId}"` } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 80,
  })

  for (const log of logs) {
    const parsed = parseAccountBalanceEntryDetail(log.detail)
    if (!parsed) continue
    if (parsed.source !== source || parsed.referenceId !== referenceId) continue
    if (parsed.direction !== expectedDirection) continue

    return {
      userId: log.userId,
      createdAt: log.createdAt,
      parsed,
    }
  }

  return null
}

function readMetadataNumber(metadata: Record<string, unknown> | undefined, key: string) {
  const value = Number(metadata?.[key])
  return Number.isFinite(value) ? value : null
}

function readMetadataString(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key]
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

async function applyFundingReview(params: {
  userId: number
  referenceId: string
  amountUsd: number
  metadata?: Record<string, unknown>
  note?: string
  decision: 'approve' | 'reject'
  adminId: number
}) {
  const rawCoin = readMetadataString(params.metadata, 'coinType')?.toUpperCase() ?? 'USDT'
  const coinType: TrackedAssetCoin = isTrackedAssetCoin(rawCoin) ? rawCoin : 'USDT'
  const prices = params.decision === 'approve' ? await getTrackedCryptoPricesUsd() : null
  const amountCrypto =
    params.decision === 'approve' && prices
      ? convertUsdToCoin(params.amountUsd, coinType, prices)
      : undefined

  await createAccountBalanceEntry({
    userId: params.userId,
    direction: 'credit',
    status: params.decision === 'approve' ? 'settled' : 'rejected',
    amountUsd: params.amountUsd,
    source: 'funding_deposit',
    referenceId: params.referenceId,
    note:
      params.decision === 'approve'
        ? 'Funding request approved by admin.'
        : 'Funding request rejected by admin.',
    metadata: {
      ...(params.metadata ?? {}),
      coinType,
      amountCrypto,
      usdPriceAtSettlement: params.decision === 'approve' ? prices?.[coinType] : undefined,
      reviewedByAdminId: params.adminId,
      reviewedAt: new Date().toISOString(),
      adminNote: params.note,
    },
  })

  await logUserActivity({
    userId: params.userId,
    action: params.decision === 'approve' ? 'AccountFundingApproved' : 'AccountFundingRejected',
    detail:
      params.decision === 'approve'
        ? `Funding request approved for $${params.amountUsd.toFixed(2)}.`
        : `Funding request rejected for $${params.amountUsd.toFixed(2)}.`,
  })
}

async function applyMiningPlanReview(params: {
  userId: number
  referenceId: string
  amountUsd: number
  metadata?: Record<string, unknown>
  note?: string
  decision: 'approve' | 'reject'
  adminId: number
}) {
  const userPlanId = readMetadataNumber(params.metadata, 'userPlanId')
  if (!userPlanId) {
    throw new HttpError(400, 'Missing mining plan reference in payment metadata.')
  }

  const prices = await getTrackedCryptoPricesUsd()
  const rawCoin = readMetadataString(params.metadata, 'coinType')?.toUpperCase() ?? 'BTC'
  const coinType: TrackedAssetCoin = isTrackedAssetCoin(rawCoin) ? rawCoin : 'BTC'
  const amountCrypto =
    readMetadataNumber(params.metadata, 'amountCrypto') ??
    convertUsdToCoin(params.amountUsd, coinType, prices)
  const miningPrices = await getCryptoPricesUsd()

  await prisma.$transaction(async tx => {
    const userPlan = await tx.userPlan.findUnique({
      where: { id: userPlanId },
      include: { user: true, plan: true },
    })

    if (!userPlan || userPlan.userId !== params.userId) {
      throw new HttpError(404, 'Mining plan request not found.')
    }

    if (!['selected', 'awaiting_payment'].includes(userPlan.status) || userPlan.paymentStatus !== 'pending') {
      throw new HttpError(409, 'This mining plan is no longer pending review.')
    }

    await createAccountBalanceEntry(
      {
        userId: params.userId,
        direction: 'debit',
        status: params.decision === 'approve' ? 'settled' : 'rejected',
        amountUsd: params.amountUsd,
        source: 'mining_plan_purchase',
        referenceId: params.referenceId,
        note:
          params.decision === 'approve'
            ? `Mining plan payment approved (${userPlan.plan.name}).`
            : `Mining plan payment rejected (${userPlan.plan.name}).`,
        metadata: {
          ...(params.metadata ?? {}),
          coinType,
          amountCrypto,
          usdPriceAtSettlement: params.decision === 'approve' ? prices[coinType] : undefined,
          reviewedByAdminId: params.adminId,
          reviewedAt: new Date().toISOString(),
          adminNote: params.note,
        },
      },
      tx
    )

    if (params.decision === 'reject') {
      await tx.userPlan.update({
        where: { id: userPlan.id },
        data: {
          status: 'selected',
          paymentStatus: 'pending',
          startDate: null,
          endDate: null,
        },
      })

      await tx.payment.updateMany({
        where: {
          userPlanId: userPlan.id,
          status: 'pending',
        },
        data: {
          status: 'rejected',
          transactionId: 'Account Balance - Rejected by Admin',
          adminNotes: params.note ?? 'Account-balance payment rejected by admin.',
          confirmations: 0,
          confirmedAt: null,
          confirmedByAdminId: null,
        },
      })

      return
    }

    const priorConfirmedPayments = await tx.payment.count({
      where: { userId: userPlan.userId, status: 'confirmed' },
    })

    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + userPlan.selectedDurationDays)

    await tx.userPlan.update({
      where: { id: userPlan.id },
      data: {
        status: 'active',
        paymentStatus: 'confirmed',
        startDate,
        endDate,
      },
    })

    await tx.user.update({
      where: { id: userPlan.userId },
      data: { accountStatus: 'active' },
    })

    if (userPlan.upgradeFromPlanId) {
      await tx.userPlan.update({
        where: { id: userPlan.upgradeFromPlanId },
        data: {
          status: 'archived',
          endDate: new Date(),
        },
      })

      await tx.miningStats.updateMany({
        where: { userPlanId: userPlan.upgradeFromPlanId },
        data: { isActive: false },
      })

      await tx.earnings.updateMany({
        where: { userPlanId: userPlan.upgradeFromPlanId },
        data: {
          isHistorical: true,
          isWithdrawable: false,
        },
      })
    }

    const existingStats = await tx.miningStats.findFirst({
      where: { userPlanId: userPlan.id },
      select: { id: true },
    })

    if (!existingStats) {
      const scaledPlanHashrate = scalePlanHashrateDecimal(userPlan.plan.baseHashrate)
      await tx.miningStats.create({
        data: {
          userId: userPlan.userId,
          userPlanId: userPlan.id,
          assignedHashrate: scaledPlanHashrate,
          hashrateUnit: userPlan.plan.hashrateUnit,
          counterSpeed: 0.001,
          algorithm: userPlan.plan.algorithm,
          miningPool: 'AntPool',
          dataCenterLocation: 'Canada (Hydro)',
          machineModel: userPlan.plan.hardwareModel,
          uptimePercentage: 99.9,
          isActive: true,
        },
      })
    }

    const existingEarningsCount = await tx.earnings.count({
      where: { userPlanId: userPlan.id },
    })

    if (existingEarningsCount === 0) {
      const durationDays = Math.max(1, userPlan.selectedDurationDays || 7)
      if (userPlan.plan.coinType === 'MULTI') {
        const allocationSplits = [
          { coinType: 'BTC', ratio: 0.6, algorithm: 'SHA-256', hardwareModel: 'Antminer S21 Hydro' },
          { coinType: 'ETH', ratio: 0.25, algorithm: 'Ethash', hardwareModel: 'Enterprise GPU Cluster' },
          { coinType: 'LTC', ratio: 0.15, algorithm: 'Scrypt', hardwareModel: 'Antminer L7' },
        ]
        const scaledPlanHashrate = scalePlanHashrateDecimal(userPlan.plan.baseHashrate)

        await tx.multiAssetAllocation.createMany({
          data: allocationSplits.map(split => ({
            userPlanId: userPlan.id,
            coinType: split.coinType,
            hashrate: scaledPlanHashrate.mul(split.ratio),
            hashrateUnit: userPlan.plan.hashrateUnit,
            algorithm: split.algorithm,
            hardwareModel: split.hardwareModel,
            maintenanceFee: userPlan.plan.maintenanceFeePerUnitDay,
            electricityCost: userPlan.plan.electricityCostPerUnitDay,
          })),
        })

        await tx.earnings.createMany({
          data: allocationSplits.map(split => {
            const coinPrice = miningPrices[split.coinType as 'BTC' | 'ETH' | 'LTC'] || 0
            const dailyEstimateCrypto = computeTargetDailyCryptoEstimate({
              planSlug: userPlan.plan.slug,
              finalPriceUsd: Number(userPlan.finalPrice),
              durationDays,
              coinUsdPrice: coinPrice,
              allocationWeight: split.ratio,
            })
            return {
              userId: userPlan.userId,
              userPlanId: userPlan.id,
              coinType: split.coinType,
              dailyEstimateUsd: coinPrice > 0 ? dailyEstimateCrypto * coinPrice : 0,
              dailyEstimateCrypto,
              totalEarnedUsd: 0,
              totalEarnedCrypto: 0,
              isActive: true,
            }
          }),
        })
      } else {
        const coinPrice = miningPrices[userPlan.plan.coinType as 'BTC' | 'ETH' | 'LTC'] || 0
        const dailyEstimateCrypto = computeTargetDailyCryptoEstimate({
          planSlug: userPlan.plan.slug,
          finalPriceUsd: Number(userPlan.finalPrice),
          durationDays,
          coinUsdPrice: coinPrice,
        })

        await tx.earnings.create({
          data: {
            userId: userPlan.userId,
            userPlanId: userPlan.id,
            coinType: userPlan.plan.coinType,
            dailyEstimateUsd: coinPrice > 0 ? dailyEstimateCrypto * coinPrice : 0,
            dailyEstimateCrypto,
            totalEarnedUsd: 0,
            totalEarnedCrypto: 0,
            isActive: true,
          },
        })
      }
    }

    const pendingPayment = await tx.payment.findFirst({
      where: { userPlanId: userPlan.id, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    })

    const payment = pendingPayment
      ? await tx.payment.update({
          where: { id: pendingPayment.id },
          data: {
            amountUsd: userPlan.finalPrice,
            amountCrypto,
            cryptoType: coinType,
            walletAddress: 'Account Balance',
            transactionId: 'Account Balance - Approved by Admin',
            status: 'confirmed',
            confirmations: 999,
            adminNotes: params.note ?? null,
            confirmedByAdminId: params.adminId,
            confirmedAt: new Date(),
          },
        })
      : await tx.payment.create({
          data: {
            userId: userPlan.userId,
            userPlanId: userPlan.id,
            amountUsd: userPlan.finalPrice,
            amountCrypto,
            cryptoType: coinType,
            walletAddress: 'Account Balance',
            transactionId: 'Account Balance - Approved by Admin',
            status: 'confirmed',
            confirmations: 999,
            confirmedByAdminId: params.adminId,
            confirmedAt: new Date(),
          },
        })

    if (priorConfirmedPayments === 0 && userPlan.user.referredById) {
      const existingBonus = await tx.referralBonus.findFirst({
        where: { refereeId: userPlan.userId },
      })

      if (!existingBonus) {
        const settingsRow = await tx.referralSettings.findFirst()
        const settings = settingsRow
          ? {
              isEnabled: settingsRow.isEnabled,
              bonusPercent: Number(settingsRow.bonusPercent),
              minPaymentUsd: Number(settingsRow.minPaymentUsd),
            }
          : DEFAULT_REFERRAL_SETTINGS

        const paymentAmountUsd = Number(userPlan.finalPrice)
        if (settings.isEnabled && paymentAmountUsd >= settings.minPaymentUsd) {
          const bonusAmount = (paymentAmountUsd * settings.bonusPercent) / 100
          await tx.referralBonus.create({
            data: {
              referrerId: userPlan.user.referredById,
              refereeId: userPlan.userId,
              paymentId: payment.id,
              amountUsd: bonusAmount,
              status: 'available',
            },
          })
        }
      }
    }
  })

  await logUserActivity({
    userId: params.userId,
    action:
      params.decision === 'approve'
        ? 'AccountBalancePlanPurchaseApproved'
        : 'AccountBalancePlanPurchaseRejected',
    detail:
      params.decision === 'approve'
        ? 'Mining plan payment from account balance approved.'
        : 'Mining plan payment from account balance rejected.',
  })
}

async function applyTradingPlanReview(params: {
  userId: number
  referenceId: string
  amountUsd: number
  metadata?: Record<string, unknown>
  note?: string
  decision: 'approve' | 'reject'
  adminId: number
}) {
  const tradingUserPlanId = readMetadataNumber(params.metadata, 'tradingUserPlanId')
  if (!tradingUserPlanId) {
    throw new HttpError(400, 'Missing trading plan reference in payment metadata.')
  }

  const prices = await getTrackedCryptoPricesUsd()
  const rawCoin = readMetadataString(params.metadata, 'coinType')?.toUpperCase() ?? 'USDT'
  const coinType: TrackedAssetCoin = isTrackedAssetCoin(rawCoin) ? rawCoin : 'USDT'
  const amountCrypto =
    readMetadataNumber(params.metadata, 'amountCrypto') ??
    convertUsdToCoin(params.amountUsd, coinType, prices)

  await prisma.$transaction(async tx => {
    const tradingPlan = await tx.tradingUserPlan.findUnique({
      where: { id: tradingUserPlanId },
      include: { plan: true },
    })

    if (!tradingPlan || tradingPlan.userId !== params.userId) {
      throw new HttpError(404, 'Trading plan request not found.')
    }

    if (!['selected', 'awaiting_payment'].includes(tradingPlan.status) || tradingPlan.paymentStatus !== 'pending') {
      throw new HttpError(409, 'This trading plan is no longer pending review.')
    }

    await createAccountBalanceEntry(
      {
        userId: params.userId,
        direction: 'debit',
        status: params.decision === 'approve' ? 'settled' : 'rejected',
        amountUsd: params.amountUsd,
        source: 'trading_plan_purchase',
        referenceId: params.referenceId,
        note:
          params.decision === 'approve'
            ? `Trading plan payment approved (${tradingPlan.plan.name}).`
            : `Trading plan payment rejected (${tradingPlan.plan.name}).`,
        metadata: {
          ...(params.metadata ?? {}),
          coinType,
          amountCrypto,
          usdPriceAtSettlement: params.decision === 'approve' ? prices[coinType] : undefined,
          reviewedByAdminId: params.adminId,
          reviewedAt: new Date().toISOString(),
          adminNote: params.note,
        },
      },
      tx
    )

    if (params.decision === 'reject') {
      await tx.tradingUserPlan.update({
        where: { id: tradingPlan.id },
        data: {
          status: 'selected',
          paymentStatus: 'pending',
          startDate: null,
          endDate: null,
        },
      })

      await tx.tradingPayment.updateMany({
        where: {
          tradingUserPlanId: tradingPlan.id,
          status: 'pending',
        },
        data: {
          status: 'rejected',
          transactionId: 'Account Balance - Rejected by Admin',
          confirmations: 0,
          confirmedAt: null,
          confirmedByAdminId: null,
        },
      })
      return
    }

    const startDate = new Date()
    const endDate = new Date(startDate.getTime() + tradingPlan.durationHours * 60 * 60 * 1000)

    await tx.tradingUserPlan.update({
      where: { id: tradingPlan.id },
      data: {
        status: 'active',
        paymentStatus: 'confirmed',
        startDate,
        endDate,
      },
    })

    await tx.user.update({
      where: { id: tradingPlan.userId },
      data: { accountStatus: 'active' },
    })

    const existingStats = await tx.tradingStat.findFirst({
      where: { tradingUserPlanId: tradingPlan.id },
    })
    if (!existingStats) {
      await tx.tradingStat.create({
        data: {
          userId: tradingPlan.userId,
          tradingUserPlanId: tradingPlan.id,
          isActive: true,
          botSpeed: 1.0,
          strategy: 'Portfolio Balance',
          riskLevel: 'balanced',
        },
      })
    }

    const existingEarnings = await tx.tradingEarning.findFirst({
      where: { tradingUserPlanId: tradingPlan.id },
    })
    if (!existingEarnings) {
      const durationDays = Math.max(1, tradingPlan.durationHours / 24)
      await tx.tradingEarning.create({
        data: {
          userId: tradingPlan.userId,
          tradingUserPlanId: tradingPlan.id,
          totalEarnedUsd: 0,
          dailyEstimateUsd: Number(tradingPlan.expectedReturnUsd) / durationDays,
          isActive: true,
        },
      })
    }

    const pendingPayment = await tx.tradingPayment.findFirst({
      where: { tradingUserPlanId: tradingPlan.id, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    })

    if (pendingPayment) {
      await tx.tradingPayment.update({
        where: { id: pendingPayment.id },
        data: {
          amountUsd: tradingPlan.investmentUsd,
          cryptoType: coinType,
          walletAddress: 'Account Balance',
          transactionId: 'Account Balance - Approved by Admin',
          status: 'confirmed',
          confirmations: 999,
          confirmedByAdminId: params.adminId,
          confirmedAt: new Date(),
        },
      })
    } else {
      await tx.tradingPayment.create({
        data: {
          userId: tradingPlan.userId,
          tradingUserPlanId: tradingPlan.id,
          amountUsd: tradingPlan.investmentUsd,
          cryptoType: coinType,
          walletAddress: 'Account Balance',
          transactionId: 'Account Balance - Approved by Admin',
          status: 'confirmed',
          confirmations: 999,
          confirmedByAdminId: params.adminId,
          confirmedAt: new Date(),
        },
      })
    }
  })

  await logUserActivity({
    userId: params.userId,
    action:
      params.decision === 'approve'
        ? 'AccountBalanceTradingPurchaseApproved'
        : 'AccountBalanceTradingPurchaseRejected',
    detail:
      params.decision === 'approve'
        ? 'Trading plan payment from account balance approved.'
        : 'Trading plan payment from account balance rejected.',
  })
}

async function applyRealEstateReview(params: {
  userId: number
  referenceId: string
  amountUsd: number
  metadata?: Record<string, unknown>
  note?: string
  decision: 'approve' | 'reject'
  adminId: number
}) {
  const ticketId =
    readMetadataNumber(params.metadata, 'ticketId') ??
    Number(params.referenceId.replace('real-estate-buy-in:', ''))

  if (!Number.isFinite(ticketId) || ticketId <= 0) {
    throw new HttpError(400, 'Missing real-estate ticket reference in payment metadata.')
  }

  await prisma.$transaction(async tx => {
    const ticket = await tx.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, userId: true, subject: true, status: true },
    })

    if (!ticket || ticket.userId !== params.userId) {
      throw new HttpError(404, 'Real-estate buy-in request not found.')
    }

    await createAccountBalanceEntry(
      {
        userId: params.userId,
        direction: 'debit',
        status: params.decision === 'approve' ? 'settled' : 'rejected',
        amountUsd: params.amountUsd,
        source: 'real_estate_buy_in',
        referenceId: params.referenceId,
        note:
          params.decision === 'approve'
            ? 'Real-estate buy-in approved.'
            : 'Real-estate buy-in rejected.',
        metadata: {
          ...(params.metadata ?? {}),
          reviewedByAdminId: params.adminId,
          reviewedAt: new Date().toISOString(),
          adminNote: params.note,
        },
      },
      tx
    )

    await tx.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: params.decision === 'approve' ? 'closed' : 'rejected',
        lastMessageAt: new Date(),
      },
    })
  })

  await logUserActivity({
    userId: params.userId,
    action:
      params.decision === 'approve'
        ? 'RealEstateBuyInApproved'
        : 'RealEstateBuyInRejected',
    detail:
      params.decision === 'approve'
        ? 'Real estate buy-in approved.'
        : 'Real estate buy-in rejected.',
  })
}

async function applyAccountWithdrawalReview(params: {
  userId: number
  referenceId: string
  amountUsd: number
  metadata?: Record<string, unknown>
  note?: string
  decision: 'approve' | 'reject'
  adminId: number
}) {
  await createAccountBalanceEntry({
    userId: params.userId,
    direction: 'debit',
    status: params.decision === 'approve' ? 'settled' : 'rejected',
    amountUsd: params.amountUsd,
    source: 'account_balance_withdrawal',
    referenceId: params.referenceId,
    note:
      params.decision === 'approve'
        ? 'Account withdrawal approved by admin.'
        : 'Account withdrawal rejected by admin.',
    metadata: {
      ...(params.metadata ?? {}),
      reviewedByAdminId: params.adminId,
      reviewedAt: new Date().toISOString(),
      adminNote: params.note,
    },
  })

  await logUserActivity({
    userId: params.userId,
    action:
      params.decision === 'approve'
        ? 'AccountBalanceWithdrawalApproved'
        : 'AccountBalanceWithdrawalRejected',
    detail:
      params.decision === 'approve'
        ? `Account withdrawal approved for $${params.amountUsd.toFixed(2)}.`
        : `Account withdrawal rejected for $${params.amountUsd.toFixed(2)}.`,
  })
}

export async function PATCH(req: Request) {
  try {
    const adminUser = await requireAdmin()
    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await readJsonObject(req, { allowedKeys: ACCOUNT_BALANCE_OPERATION_FIELDS })
    const sourceRaw = readStringField(body, 'source', { required: true, maxLength: 60 })!
    if (!isReviewableSource(sourceRaw)) {
      return NextResponse.json({ error: 'Unsupported account-balance source.' }, { status: 400 })
    }

    const referenceId = readStringField(body, 'referenceId', { required: true, maxLength: 120 })!
    const decision = readStringField(body, 'decision', {
      required: true,
      enumValues: ['approve', 'reject'],
    }) as 'approve' | 'reject'
    const note = readStringField(body, 'note', { maxLength: 240 }) || undefined

    const latestEntry = await getLatestOperationEntry(sourceRaw, referenceId)
    if (!latestEntry) {
      return NextResponse.json({ error: 'Pending account-balance operation not found.' }, { status: 404 })
    }
    if (latestEntry.parsed.status !== 'pending') {
      return NextResponse.json({ error: 'This operation has already been reviewed.' }, { status: 409 })
    }

    const payload = {
      userId: latestEntry.userId,
      referenceId,
      amountUsd: latestEntry.parsed.amountUsd,
      metadata: latestEntry.parsed.metadata,
      note,
      decision,
      adminId: adminUser.id,
    }

    if (sourceRaw === 'funding_deposit') {
      await applyFundingReview(payload)
    } else if (sourceRaw === 'mining_plan_purchase') {
      await applyMiningPlanReview(payload)
    } else if (sourceRaw === 'trading_plan_purchase') {
      await applyTradingPlanReview(payload)
    } else if (sourceRaw === 'real_estate_buy_in') {
      await applyRealEstateReview(payload)
    } else if (sourceRaw === 'account_balance_withdrawal') {
      await applyAccountWithdrawalReview(payload)
    }

    await prisma.adminActivityLog.create({
      data: {
        actorAdminId: adminUser.id,
        targetUserId: latestEntry.userId,
        action: 'accountBalanceOperationReviewed',
        detail: `${sourceRaw} ${referenceId} ${decision}d.`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Account balance operation review error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const adminUser = await requireAdmin()
    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await readJsonObject(req, { allowedKeys: ACCOUNT_BALANCE_MANUAL_CREATE_FIELDS })
    const targetUserId = readNumberField(body, 'userId', {
      required: true,
      integer: true,
      min: 1,
    })!
    const adjustmentTypeRaw = readStringField(body, 'adjustmentType', {
      required: true,
      enumValues: MANUAL_ADJUSTMENT_TYPES,
    })!
    if (!isManualAdjustmentType(adjustmentTypeRaw)) {
      return NextResponse.json({ error: 'Invalid adjustment type.' }, { status: 400 })
    }

    const amountUsd = readNumberField(body, 'amountUsd', {
      required: true,
      min: 1,
      max: 100000000,
    })!
    const coinTypeRaw = readStringField(body, 'coinType', {
      required: true,
      toUpperCase: true,
      enumValues: ['BTC', 'ETH', 'USDT', 'SOL'],
    })!
    const paymentMethod = readStringField(body, 'paymentMethod', {
      required: true,
      maxLength: 120,
    })!
    const note = readStringField(body, 'note', { maxLength: 240 }) || undefined

    if (!isTrackedAssetCoin(coinTypeRaw)) {
      return NextResponse.json({ error: 'Unsupported coin type.' }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, fullName: true, email: true },
    })
    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found.' }, { status: 404 })
    }

    const direction: AccountBalanceDirection = adjustmentTypeRaw === 'deposit' ? 'credit' : 'debit'
    if (direction === 'debit') {
      const balance = await getAccountBalanceSummary(targetUserId)
      if (balance.availableToSpendUsd < amountUsd) {
        return NextResponse.json(
          {
            error: `Insufficient balance for manual withdrawal. Available: $${balance.availableToSpendUsd.toFixed(2)}.`,
          },
          { status: 400 }
        )
      }
    }

    const prices = await getTrackedCryptoPricesUsd()
    const amountCrypto = convertUsdToCoin(amountUsd, coinTypeRaw, prices)
    const referenceId = `admin-manual-adjustment:${randomUUID()}`
    const createdAt = new Date()

    const entry = await createAccountBalanceEntry({
      userId: targetUserId,
      direction,
      status: 'settled',
      amountUsd,
      source: 'admin_manual_adjustment',
      referenceId,
      note:
        note ??
        `${adjustmentTypeRaw === 'deposit' ? 'Manual deposit' : 'Manual withdrawal'} recorded by admin.`,
      metadata: {
        coinType: coinTypeRaw,
        amountCrypto,
        usdPriceAtSettlement: prices[coinTypeRaw],
        customPaymentMethod: paymentMethod,
        adjustmentType: adjustmentTypeRaw,
        recordedByAdminId: adminUser.id,
        recordedAt: createdAt.toISOString(),
      },
    })

    await prisma.adminActivityLog.create({
      data: {
        actorAdminId: adminUser.id,
        targetUserId,
        action: 'accountBalanceManualAdjustmentCreated',
        detail: `${adjustmentTypeRaw} $${amountUsd.toFixed(2)} via ${paymentMethod} (${coinTypeRaw}).`,
      },
    })

    await logUserActivity({
      userId: targetUserId,
      action: 'AccountBalanceManualAdjustmentRecorded',
      detail: `Admin recorded a ${adjustmentTypeRaw} of $${amountUsd.toFixed(2)} via ${paymentMethod}.`,
    })

    return NextResponse.json({
      success: true,
      entry: {
        id: entry.id,
        referenceId: entry.referenceId,
        direction: entry.direction,
        amountUsd: entry.amountUsd,
        coinType: coinTypeRaw,
        amountCrypto,
        createdAt: entry.createdAt.toISOString(),
        userName: targetUser.fullName || targetUser.email || 'Unknown',
      },
    })
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Create manual account-balance adjustment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const adminUser = await requireAdmin()
    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await readJsonObject(req, { allowedKeys: ACCOUNT_BALANCE_MANUAL_DELETE_FIELDS })
    const entryId = readNumberField(body, 'entryId', {
      required: true,
      integer: true,
      min: 1,
    })!
    const reason = readStringField(body, 'reason', { maxLength: 240 }) || 'Manual correction by admin.'

    const log = await prisma.userActivityLog.findUnique({
      where: { id: entryId },
      select: { id: true, userId: true, action: true, detail: true },
    })

    if (!log || log.action !== ACCOUNT_BALANCE_ENTRY_ACTION) {
      return NextResponse.json({ error: 'Transaction record not found.' }, { status: 404 })
    }

    const parsed = parseAccountBalanceEntryDetail(log.detail)
    if (!parsed || parsed.source !== 'admin_manual_adjustment') {
      return NextResponse.json(
        { error: 'Only manual admin adjustments can be removed from this control.' },
        { status: 400 }
      )
    }

    await prisma.userActivityLog.delete({
      where: { id: entryId },
    })

    await prisma.adminActivityLog.create({
      data: {
        actorAdminId: adminUser.id,
        targetUserId: log.userId,
        action: 'accountBalanceManualAdjustmentRemoved',
        detail: `Removed manual adjustment ${parsed.referenceId}. Reason: ${reason}`,
      },
    })

    await logUserActivity({
      userId: log.userId,
      action: 'AccountBalanceManualAdjustmentRemoved',
      detail: 'Admin removed a manual account-balance adjustment record.',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Delete manual account-balance adjustment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const adminUser = await requireAdmin()
    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const logs = await prisma.userActivityLog.findMany({
      where: { action: 'AccountBalanceEntry' },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    })

    const latestByKey = new Map<
      string,
      {
        userId: number
        createdAt: Date
        source: ReviewableSource
        referenceId: string
        amountUsd: number
        status: string
        direction: AccountBalanceDirection
        metadata?: Record<string, unknown>
      }
    >()

    for (const log of logs) {
      const parsed = parseAccountBalanceEntryDetail(log.detail)
      if (!parsed || !isReviewableSource(parsed.source)) continue
      const key = `${parsed.source}:${parsed.direction}:${parsed.referenceId}`
      if (latestByKey.has(key)) continue
      latestByKey.set(key, {
        userId: log.userId,
        createdAt: log.createdAt,
        source: parsed.source,
        referenceId: parsed.referenceId,
        amountUsd: parsed.amountUsd,
        status: parsed.status,
        direction: parsed.direction,
        metadata: parsed.metadata,
      })
    }

    const pending = [...latestByKey.values()]
      .filter(item => item.status === 'pending')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    const users = await prisma.user.findMany({
      where: { id: { in: pending.map(item => item.userId) } },
      select: { id: true, fullName: true, email: true },
    })
    const userMap = new Map(users.map(user => [user.id, user]))

    const withNames = pending.map(item => ({
      ...item,
      userName: userMap.get(item.userId)?.fullName || userMap.get(item.userId)?.email || 'Unknown',
      userEmail: userMap.get(item.userId)?.email || '',
    }))

    return NextResponse.json({ operations: withNames })
  } catch (error) {
    console.error('List account-balance operations error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
