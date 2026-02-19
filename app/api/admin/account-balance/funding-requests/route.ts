import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import {
  AccountFreezeError,
  assertIncomingAllowed,
  getAccountFreezeSettings,
  logAccountFreezeTableMissing,
} from '@/lib/account-freeze'
import {
  createAccountBalanceEntry,
  parseAccountBalanceEntryDetail,
} from '@/lib/account-balance'
import {
  convertUsdToCoin,
  getTrackedCryptoPricesUsd,
  isTrackedAssetCoin,
  type TrackedAssetCoin,
} from '@/lib/crypto-prices'
import { logUserActivity } from '@/lib/user-activity'
import {
  isInputValidationError,
  readJsonObject,
  readStringField,
} from '@/lib/requestValidation'

const FUNDING_REQUEST_PATCH_FIELDS = ['requestId', 'decision', 'note'] as const
const MAX_LOOKBACK = 4000

type FundingRequestRow = {
  requestId: string
  userId: number
  amountUsd: number
  coinType: string | null
  txid: string | null
  proofUrl: string | null
  createdAt: string
}

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

export async function GET() {
  try {
    const adminUser = await requireAdmin()
    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const logs = await prisma.userActivityLog.findMany({
      where: { action: 'AccountBalanceEntry' },
      orderBy: { createdAt: 'desc' },
      take: MAX_LOOKBACK,
    })

    const pendingByReference = new Map<string, FundingRequestRow>()
    const resolvedReferences = new Set<string>()

    for (const log of logs) {
      const parsed = parseAccountBalanceEntryDetail(log.detail)
      if (!parsed || parsed.source !== 'funding_deposit') continue

      if (parsed.status === 'settled' || parsed.status === 'rejected') {
        resolvedReferences.add(parsed.referenceId)
        pendingByReference.delete(parsed.referenceId)
        continue
      }

      if (parsed.status === 'pending' && !resolvedReferences.has(parsed.referenceId)) {
        pendingByReference.set(parsed.referenceId, {
          requestId: parsed.referenceId,
          userId: log.userId,
          amountUsd: parsed.amountUsd,
          coinType: typeof parsed.metadata?.coinType === 'string' ? parsed.metadata.coinType : null,
          txid: typeof parsed.metadata?.txid === 'string' ? parsed.metadata.txid : null,
          proofUrl: typeof parsed.metadata?.proofUrl === 'string' ? parsed.metadata.proofUrl : null,
          createdAt: log.createdAt.toISOString(),
        })
      }
    }

    const pendingRows = [...pendingByReference.values()]
    const users = await prisma.user.findMany({
      where: { id: { in: pendingRows.map(row => row.userId) } },
      select: { id: true, fullName: true, email: true },
    })
    const userMap = new Map(users.map(user => [user.id, user]))

    return NextResponse.json({
      requests: pendingRows.map(row => ({
        ...row,
        userName: userMap.get(row.userId)?.fullName || userMap.get(row.userId)?.email || 'Unknown',
        userEmail: userMap.get(row.userId)?.email || '',
      })),
    })
  } catch (error) {
    console.error('List funding requests error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const adminUser = await requireAdmin()
    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await readJsonObject(req, { allowedKeys: FUNDING_REQUEST_PATCH_FIELDS })
    const requestId = readStringField(body, 'requestId', { required: true, maxLength: 100 })!
    const decision = readStringField(body, 'decision', {
      required: true,
      enumValues: ['approve', 'reject'],
    })!
    const note = readStringField(body, 'note', { maxLength: 240 }) || undefined

    const logs = await prisma.userActivityLog.findMany({
      where: {
        action: 'AccountBalanceEntry',
        detail: { contains: `"referenceId":"${requestId}"` },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    let pendingEntry: { userId: number; amountUsd: number; metadata?: Record<string, unknown> } | null = null
    let isAlreadyResolved = false

    for (const log of logs) {
      const parsed = parseAccountBalanceEntryDetail(log.detail)
      if (!parsed || parsed.referenceId !== requestId || parsed.source !== 'funding_deposit') continue
      if (parsed.status === 'settled' || parsed.status === 'rejected') {
        isAlreadyResolved = true
        break
      }
      if (parsed.status === 'pending' && !pendingEntry) {
        pendingEntry = {
          userId: log.userId,
          amountUsd: parsed.amountUsd,
          metadata: parsed.metadata,
        }
      }
    }

    if (isAlreadyResolved) {
      return NextResponse.json({ error: 'This funding request is already resolved.' }, { status: 409 })
    }
    if (!pendingEntry) {
      return NextResponse.json({ error: 'Pending funding request not found.' }, { status: 404 })
    }

    const status = decision === 'approve' ? 'settled' : 'rejected'
    const rawCoinType = typeof pendingEntry.metadata?.coinType === 'string' ? pendingEntry.metadata.coinType.toUpperCase() : ''
    const coinType: TrackedAssetCoin = isTrackedAssetCoin(rawCoinType) ? rawCoinType : 'USDT'
    const prices = await getTrackedCryptoPricesUsd()
    const amountCrypto = convertUsdToCoin(pendingEntry.amountUsd, coinType, prices)

    if (decision === 'approve') {
      const freezeQuery = await getAccountFreezeSettings(pendingEntry.userId)
      if (freezeQuery.tableMissing) {
        logAccountFreezeTableMissing('api/admin/account-balance/funding-requests:PATCH')
      } else {
        assertIncomingAllowed({
          settings: freezeQuery.settings,
          coinType,
          context: 'funding approval',
        })
      }
    }

    await createAccountBalanceEntry({
      userId: pendingEntry.userId,
      direction: 'credit',
      status,
      amountUsd: pendingEntry.amountUsd,
      source: 'funding_deposit',
      referenceId: requestId,
      note:
        decision === 'approve'
          ? 'Funding request approved.'
          : 'Funding request rejected.',
      metadata: {
        ...(pendingEntry.metadata || {}),
        coinType,
        amountCrypto: status === 'settled' ? amountCrypto : undefined,
        usdPriceAtSettlement: status === 'settled' ? prices[coinType] : undefined,
        reviewedByAdminId: adminUser.id,
        reviewedAt: new Date().toISOString(),
        adminNote: note,
      },
    })

    await logUserActivity({
      userId: pendingEntry.userId,
      action: decision === 'approve' ? 'AccountFundingApproved' : 'AccountFundingRejected',
      detail:
        decision === 'approve'
          ? `Funding request approved for $${pendingEntry.amountUsd.toFixed(2)}.`
          : `Funding request rejected for $${pendingEntry.amountUsd.toFixed(2)}.`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AccountFreezeError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Review funding request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
