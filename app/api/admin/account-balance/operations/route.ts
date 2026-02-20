import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { randomUUID } from 'crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { scalePlanHashrateDecimal } from '@/lib/mining-hashrate'
import { getCryptoPricesUsd } from '@/lib/earnings'
import { computeTargetDailyCryptoEstimate } from '@/lib/mining-engine'
import {
  AccountFreezeError,
  assertIncomingAllowed,
  getAccountFreezeSettings,
  logAccountFreezeTableMissing,
} from '@/lib/account-freeze'
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
import { REAL_ESTATE_BUY_IN_TICKET_PREFIX } from '@/lib/real-estate-dashboard'
import {
  sendAccountFundingReviewedEmail,
  sendAccountWithdrawalReviewedEmail,
  sendMiningPlanActivatedEmail,
  sendPlanPaymentReviewedEmail,
  sendRealEstateBuyInReviewedEmail,
  sendTradingPlanActivatedEmail,
} from '@/lib/transactional-email'
import {
  isInputValidationError,
  readBooleanField,
  readJsonObject,
  readNumberField,
  readStringField,
} from '@/lib/requestValidation'
import { logUserActivity } from '@/lib/user-activity'

const ACCOUNT_BALANCE_OPERATION_FIELDS = ['source', 'referenceId', 'decision', 'note', 'notifyUser'] as const
const ACCOUNT_BALANCE_MANUAL_CREATE_FIELDS = [
  'userId',
  'adjustmentType',
  'amountUsd',
  'coinType',
  'paymentMethod',
  'note',
  'notifyUser',
] as const
const ACCOUNT_BALANCE_MANUAL_DELETE_FIELDS = [
  'entryId',
  'reason',
  'notifyUser',
  'logType',
  'deleteMode',
] as const
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
type ActivityDeleteMode = 'log_only' | 'log_and_action'
type UnsafeTx = Prisma.TransactionClient & Record<string, any>

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

async function getEmailRecipient(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, fullName: true },
  })
  if (!user?.email) return null
  return user
}

const parseBuyInSubject = (subject: string) => {
  const withoutPrefix = subject.replace(REAL_ESTATE_BUY_IN_TICKET_PREFIX, '').trim()
  const tierMatch = withoutPrefix.match(/\(([^)]+)\)\s*$/)
  const tierName = tierMatch?.[1]?.trim() || 'Selected Tier'
  const tierStartIndex = typeof tierMatch?.index === 'number' ? tierMatch.index : withoutPrefix.length
  const propertyTitle = tierMatch
    ? withoutPrefix.slice(0, Math.max(0, tierStartIndex)).trim()
    : withoutPrefix
  return {
    propertyTitle: propertyTitle || 'Property',
    tierName,
  }
}

async function applyFundingReview(params: {
  userId: number
  referenceId: string
  amountUsd: number
  metadata?: Record<string, unknown>
  note?: string
  decision: 'approve' | 'reject'
  adminId: number
  notifyUser: boolean
}) {
  const rawCoin = readMetadataString(params.metadata, 'coinType')?.toUpperCase() ?? 'USDT'
  const coinType: TrackedAssetCoin = isTrackedAssetCoin(rawCoin) ? rawCoin : 'USDT'
  const prices = params.decision === 'approve' ? await getTrackedCryptoPricesUsd() : null
  const amountCrypto =
    params.decision === 'approve' && prices
      ? convertUsdToCoin(params.amountUsd, coinType, prices)
      : undefined

  if (params.decision === 'approve') {
    const freezeQuery = await getAccountFreezeSettings(params.userId)
    if (freezeQuery.tableMissing) {
      logAccountFreezeTableMissing('api/admin/account-balance/operations:applyFundingReview')
    } else {
      assertIncomingAllowed({
        settings: freezeQuery.settings,
        coinType,
        context: 'funding approval',
      })
    }
  }

  await createAccountBalanceEntry({
    userId: params.userId,
    direction: 'credit',
    status: params.decision === 'approve' ? 'settled' : 'rejected',
    amountUsd: params.amountUsd,
    source: 'funding_deposit',
    referenceId: params.referenceId,
    note:
      params.decision === 'approve'
        ? 'Funding request approved.'
        : 'Funding request rejected.',
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

  if (params.notifyUser) {
    await logUserActivity({
      userId: params.userId,
      action: params.decision === 'approve' ? 'AccountFundingApproved' : 'AccountFundingRejected',
      detail:
        params.decision === 'approve'
          ? `Funding request approved for $${params.amountUsd.toFixed(2)}.`
          : `Funding request rejected for $${params.amountUsd.toFixed(2)}.`,
    })
  }

  const user = await getEmailRecipient(params.userId)
  if (user) {
    await sendAccountFundingReviewedEmail({
      to: user.email,
      fullName: user.fullName,
      amountUsd: params.amountUsd,
      coinType,
      referenceId: params.referenceId,
      decision: params.decision,
    })
  }
}

async function applyMiningPlanReview(params: {
  userId: number
  referenceId: string
  amountUsd: number
  metadata?: Record<string, unknown>
  note?: string
  decision: 'approve' | 'reject'
  adminId: number
  notifyUser: boolean
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

  await prisma.$transaction(async (tx: UnsafeTx) => {
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
          status: 'rejected',
          paymentStatus: 'rejected',
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
          transactionId: 'Account Balance - Rejected',
          adminNotes: params.note ?? 'Account-balance payment rejected.',
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
            transactionId: 'Account Balance - Approved',
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
            transactionId: 'Account Balance - Approved',
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
  }, { maxWait: 5_000, timeout: 30_000 })

  if (params.notifyUser) {
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

  const [user, plan] = await Promise.all([
    getEmailRecipient(params.userId),
    prisma.userPlan.findUnique({
      where: { id: userPlanId },
      include: { plan: true },
    }),
  ])

  if (user?.email && plan) {
    if (params.decision === 'approve') {
      await sendMiningPlanActivatedEmail({
        to: user.email,
        fullName: user.fullName,
        planName: plan.plan.name,
        durationDays: plan.selectedDurationDays,
        amountUsd: Number(plan.finalPrice),
      })
    } else {
      await sendPlanPaymentReviewedEmail({
        to: user.email,
        fullName: user.fullName,
        planType: 'Mining',
        planName: plan.plan.name,
        amountUsd: Number(plan.finalPrice),
        referenceId: params.referenceId,
        decision: 'reject',
      })
    }
  }
}

async function applyTradingPlanReview(params: {
  userId: number
  referenceId: string
  amountUsd: number
  metadata?: Record<string, unknown>
  note?: string
  decision: 'approve' | 'reject'
  adminId: number
  notifyUser: boolean
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

  await prisma.$transaction(async (tx: UnsafeTx) => {
    const tradingPlanRows = await tx.$queryRaw<
      Array<{
        id: number
        userId: number
        status: string
        paymentStatus: string
        durationHours: number
        expectedReturnUsd: Prisma.Decimal | number
        investmentUsd: Prisma.Decimal | number
        planName: string | null
      }>
    >(
      Prisma.sql`
        SELECT
          tup.id,
          tup.user_id AS userId,
          tup.status,
          tup.payment_status AS paymentStatus,
          tup.duration_hours AS durationHours,
          tup.expected_return_usd AS expectedReturnUsd,
          tup.investment_usd AS investmentUsd,
          tp.name AS planName
        FROM trading_user_plans tup
        LEFT JOIN trading_plans tp ON tp.id = tup.plan_id
        WHERE tup.id = ${tradingUserPlanId}
        LIMIT 1
      `
    )
    const tradingPlan = tradingPlanRows[0]

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
            ? `Trading plan payment approved (${tradingPlan.planName ?? 'Trading plan'}).`
            : `Trading plan payment rejected (${tradingPlan.planName ?? 'Trading plan'}).`,
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
      await tx.$executeRaw(
        Prisma.sql`
          UPDATE trading_user_plans
          SET
            status = 'rejected',
            payment_status = 'rejected',
            start_date = NULL,
            end_date = NULL,
            updated_at = NOW(3)
          WHERE id = ${tradingPlan.id}
        `
      )

      await tx.$executeRaw(
        Prisma.sql`
          UPDATE trading_payments
          SET
            status = 'rejected',
            transaction_id = 'Account Balance - Rejected',
            confirmations = 0,
            confirmed_at = NULL,
            confirmed_by_admin_id = NULL
          WHERE trading_user_plan_id = ${tradingPlan.id}
            AND status = 'pending'
        `
      )
      return
    }

    const startDate = new Date()
    const endDate = new Date(startDate.getTime() + tradingPlan.durationHours * 60 * 60 * 1000)

    await tx.$executeRaw(
      Prisma.sql`
        UPDATE trading_user_plans
        SET
          status = 'active',
          payment_status = 'confirmed',
          start_date = ${startDate},
          end_date = ${endDate},
          updated_at = NOW(3)
        WHERE id = ${tradingPlan.id}
      `
    )

    await tx.user.update({
      where: { id: tradingPlan.userId },
      data: { accountStatus: 'active' },
    })

    const existingStats = await tx.$queryRaw<Array<{ id: number }>>(
      Prisma.sql`
        SELECT id
        FROM trading_stats
        WHERE trading_user_plan_id = ${tradingPlan.id}
        LIMIT 1
      `
    )
    if (existingStats.length === 0) {
      await tx.$executeRaw(
        Prisma.sql`
          INSERT INTO trading_stats
            (user_id, trading_user_plan_id, is_active, bot_speed, strategy, risk_level, updated_at)
          VALUES
            (${tradingPlan.userId}, ${tradingPlan.id}, ${true}, ${1.0}, ${'Portfolio Balance'}, ${'balanced'}, NOW(3))
        `
      )
    }

    const existingEarnings = await tx.$queryRaw<Array<{ id: number }>>(
      Prisma.sql`
        SELECT id
        FROM trading_earnings
        WHERE trading_user_plan_id = ${tradingPlan.id}
        LIMIT 1
      `
    )
    if (existingEarnings.length === 0) {
      const durationDays = Math.max(1, tradingPlan.durationHours / 24)
      await tx.$executeRaw(
        Prisma.sql`
          INSERT INTO trading_earnings
            (user_id, trading_user_plan_id, total_earned_usd, daily_estimate_usd, is_active, updated_at)
          VALUES
            (${tradingPlan.userId}, ${tradingPlan.id}, ${0}, ${Number(tradingPlan.expectedReturnUsd) / durationDays}, ${true}, NOW(3))
        `
      )
    }

    const pendingPayment = await tx.$queryRaw<Array<{ id: number }>>(
      Prisma.sql`
        SELECT id
        FROM trading_payments
        WHERE trading_user_plan_id = ${tradingPlan.id}
          AND status = 'pending'
        ORDER BY created_at DESC
        LIMIT 1
      `
    )

    if (pendingPayment.length > 0) {
      await tx.$executeRaw(
        Prisma.sql`
          UPDATE trading_payments
          SET
            amount_usd = ${Number(tradingPlan.investmentUsd)},
            crypto_type = ${coinType},
            wallet_address = ${'Account Balance'},
            transaction_id = ${'Account Balance - Approved'},
            status = ${'confirmed'},
            confirmations = ${999},
            confirmed_by_admin_id = ${params.adminId},
            confirmed_at = ${new Date()}
          WHERE id = ${pendingPayment[0].id}
        `
      )
    } else {
      await tx.$executeRaw(
        Prisma.sql`
          INSERT INTO trading_payments
            (user_id, trading_user_plan_id, amount_usd, crypto_type, wallet_address, transaction_id, status, confirmations, confirmed_by_admin_id, confirmed_at)
          VALUES
            (${tradingPlan.userId}, ${tradingPlan.id}, ${Number(tradingPlan.investmentUsd)}, ${coinType}, ${'Account Balance'}, ${'Account Balance - Approved'}, ${'confirmed'}, ${999}, ${params.adminId}, ${new Date()})
        `
      )
    }
  }, { maxWait: 5_000, timeout: 30_000 })

  if (params.notifyUser) {
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

  const [user, plan] = await Promise.all([
    getEmailRecipient(params.userId),
    prisma.tradingUserPlan.findUnique({
      where: { id: tradingUserPlanId },
      include: { plan: true },
    }),
  ])

  if (user?.email && plan) {
    if (params.decision === 'approve') {
      await sendTradingPlanActivatedEmail({
        to: user.email,
        fullName: user.fullName,
        planName: plan.plan.name,
        durationHours: plan.durationHours,
        amountUsd: Number(plan.investmentUsd),
      })
    } else {
      await sendPlanPaymentReviewedEmail({
        to: user.email,
        fullName: user.fullName,
        planType: 'Trading',
        planName: plan.plan.name,
        amountUsd: Number(plan.investmentUsd),
        referenceId: params.referenceId,
        decision: 'reject',
      })
    }
  }
}

async function applyRealEstateReview(params: {
  userId: number
  referenceId: string
  amountUsd: number
  metadata?: Record<string, unknown>
  note?: string
  decision: 'approve' | 'reject'
  adminId: number
  notifyUser: boolean
}) {
  const ticketId =
    readMetadataNumber(params.metadata, 'ticketId') ??
    Number(params.referenceId.replace('real-estate-buy-in:', ''))

  if (!Number.isFinite(ticketId) || ticketId <= 0) {
    throw new HttpError(400, 'Missing real-estate ticket reference in payment metadata.')
  }

  await prisma.$transaction(async (tx: UnsafeTx) => {
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

  if (params.notifyUser) {
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

  const [user, ticket] = await Promise.all([
    getEmailRecipient(params.userId),
    prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { subject: true },
    }),
  ])
  if (user && ticket?.subject) {
    const { propertyTitle, tierName } = parseBuyInSubject(ticket.subject)
    await sendRealEstateBuyInReviewedEmail({
      to: user.email,
      fullName: user.fullName,
      propertyTitle,
      tierName,
      amountUsd: params.amountUsd,
      referenceId: params.referenceId,
      decision: params.decision,
    })
  }
}

async function applyAccountWithdrawalReview(params: {
  userId: number
  referenceId: string
  amountUsd: number
  metadata?: Record<string, unknown>
  note?: string
  decision: 'approve' | 'reject'
  adminId: number
  notifyUser: boolean
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
        ? 'Account withdrawal approved.'
        : 'Account withdrawal rejected.',
    metadata: {
      ...(params.metadata ?? {}),
      reviewedByAdminId: params.adminId,
      reviewedAt: new Date().toISOString(),
      adminNote: params.note,
    },
  })

  if (params.notifyUser) {
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

  const user = await getEmailRecipient(params.userId)
  if (user) {
    await sendAccountWithdrawalReviewedEmail({
      to: user.email,
      fullName: user.fullName,
      amountUsd: params.amountUsd,
      coinType: readMetadataString(params.metadata, 'coinType') ?? 'USDT',
      referenceId: params.referenceId,
      decision: params.decision,
    })
  }
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
    const notifyUser = readBooleanField(body, 'notifyUser') ?? true

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
      notifyUser,
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
    if (error instanceof AccountFreezeError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
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
    const notifyUser = readBooleanField(body, 'notifyUser') ?? true

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
      if (balance.withdrawableEarningsUsd < amountUsd) {
        return NextResponse.json(
          {
            error: `Insufficient withdrawable earnings for manual withdrawal. Available: $${balance.withdrawableEarningsUsd.toFixed(2)}.`,
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
        `${adjustmentTypeRaw === 'deposit' ? 'Manual deposit' : 'Manual withdrawal'} recorded.`,
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

    if (notifyUser) {
      await logUserActivity({
        userId: targetUserId,
        action: 'AccountBalanceManualAdjustmentRecorded',
        detail: `${adjustmentTypeRaw === 'deposit' ? 'Manual deposit' : 'Manual withdrawal'} recorded for $${amountUsd.toFixed(2)} via ${paymentMethod}.`,
      })
    }

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
    const reason = readStringField(body, 'reason', { maxLength: 240 }) || 'Manual correction.'
    const notifyUser = readBooleanField(body, 'notifyUser') ?? true
    const logType = readStringField(body, 'logType', { enumValues: ['manual_adjustment', 'activity'] }) || 'manual_adjustment'
    const deleteMode = (readStringField(body, 'deleteMode', {
      enumValues: ['log_only', 'log_and_action'],
    }) || 'log_only') as ActivityDeleteMode

    const log = await prisma.userActivityLog.findUnique({
      where: { id: entryId },
      select: { id: true, userId: true, action: true, detail: true },
    })

    if (!log) {
      return NextResponse.json({ error: 'Transaction record not found.' }, { status: 404 })
    }

    let adminLogAction = 'accountBalanceActivityLogRemoved'
    let adminLogDetail = `Removed user activity log #${log.id}. Reason: ${reason}`
    let userAction = 'AccountActivityLogRemoved'
    let userDetail = 'An account activity log entry was removed during a correction.'
    const parsedBalanceEntry = parseAccountBalanceEntryDetail(log.detail)
    const isBalanceEntryAction = log.action === ACCOUNT_BALANCE_ENTRY_ACTION && Boolean(parsedBalanceEntry)
    const hasFinancialImpact = isBalanceEntryAction && parsedBalanceEntry?.status === 'settled'

    if (logType === 'manual_adjustment') {
      if (log.action !== ACCOUNT_BALANCE_ENTRY_ACTION) {
        return NextResponse.json(
          { error: 'This record is not a manual account-balance adjustment entry.' },
          { status: 400 }
        )
      }
      const parsed = parseAccountBalanceEntryDetail(log.detail)
      if (!parsed || parsed.source !== 'admin_manual_adjustment') {
        return NextResponse.json(
          { error: 'Only manual admin adjustments can be removed from this control.' },
          { status: 400 }
        )
      }
      adminLogAction = 'accountBalanceManualAdjustmentRemoved'
      adminLogDetail = `Removed manual adjustment ${parsed.referenceId}. Reason: ${reason}`
      userAction = 'AccountBalanceManualAdjustmentRemoved'
      userDetail = 'Manual account-balance adjustment record was removed.'
    } else {
      if (deleteMode === 'log_only' && hasFinancialImpact) {
        return NextResponse.json(
          { error: 'This entry affects balance. Use "delete log + financial action".' },
          { status: 409 }
        )
      }
      const isAccountRelatedActivity =
        log.action.startsWith('Account') ||
        log.action === 'RealEstateBuyInApproved' ||
        log.action === 'RealEstateBuyInRejected'

      if (!isAccountRelatedActivity) {
        return NextResponse.json(
          { error: 'Only account-related activity logs can be removed from this control.' },
          { status: 400 }
        )
      }
      if (deleteMode === 'log_and_action') {
        if (!hasFinancialImpact) {
          return NextResponse.json(
            { error: 'Selected log does not carry a settled financial effect.' },
            { status: 400 }
          )
        }
        adminLogAction = 'accountBalanceActivityAndEffectRemoved'
        adminLogDetail = `Removed activity log #${log.id} and deleted linked financial effect. Reason: ${reason}`
        userAction = 'AccountActivityAndEffectRemoved'
        userDetail = 'An account activity entry and its linked financial effect were removed during a correction.'
      }
    }

    await prisma.userActivityLog.delete({
      where: { id: entryId },
    })

    await prisma.adminActivityLog.create({
      data: {
        actorAdminId: adminUser.id,
        targetUserId: log.userId,
        action: adminLogAction,
        detail: adminLogDetail,
      },
    })

    if (notifyUser) {
      await logUserActivity({
        userId: log.userId,
        action: userAction,
        detail: userDetail,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Delete account activity log error:', error)
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
