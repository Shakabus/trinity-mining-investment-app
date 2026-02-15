import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import {
  createAccountBalanceEntry,
  getAccountBalanceAssetSummary,
  getAccountBalanceSummary,
  hasSettledEntryForReference,
} from '@/lib/account-balance'
import {
  TRACKED_ASSET_COINS,
  convertUsdToCoin,
  getTrackedCryptoPricesUsd,
} from '@/lib/crypto-prices'
import { REAL_ESTATE_BUY_IN_TICKET_PREFIX } from '@/lib/real-estate-dashboard'
import { logUserActivity } from '@/lib/user-activity'
import {
  isInputValidationError,
  readJsonObject,
  readStringField,
} from '@/lib/requestValidation'

const PAY_REAL_ESTATE_FIELDS = [
  'propertyId',
  'title',
  'location',
  'tier',
  'minimum',
  'duration',
  'payoutModel',
  'projectedBand',
  'illustrativeOutcome',
] as const

const parseAmountUsd = (value: string) => {
  const amount = Number(value.replace(/[^0-9.]/g, ''))
  return Number.isFinite(amount) ? amount : 0
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await readJsonObject(req, { allowedKeys: PAY_REAL_ESTATE_FIELDS })
    const propertyId = readStringField(body, 'propertyId', { required: true, maxLength: 80 })!
    const title = readStringField(body, 'title', { required: true, maxLength: 160 })!
    const location = readStringField(body, 'location', { required: true, maxLength: 160 })!
    const tier = readStringField(body, 'tier', { required: true, maxLength: 120 })!
    const minimum = readStringField(body, 'minimum', { required: true, maxLength: 80 })!
    const duration = readStringField(body, 'duration', { maxLength: 120 }) || '-'
    const payoutModel = readStringField(body, 'payoutModel', { maxLength: 120 }) || '-'
    const projectedBand = readStringField(body, 'projectedBand', { maxLength: 120 }) || '-'
    const illustrativeOutcome = readStringField(body, 'illustrativeOutcome', { maxLength: 240 }) || '-'

    const minimumUsd = parseAmountUsd(minimum)
    if (minimumUsd <= 0) {
      return NextResponse.json({ error: 'Invalid buy-in amount.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const pendingBuyIn = await prisma.supportTicket.findFirst({
      where: {
        userId: user.id,
        subject: { startsWith: REAL_ESTATE_BUY_IN_TICKET_PREFIX },
        status: { in: ['open', 'waiting'] },
      },
      select: { id: true },
    })

    if (pendingBuyIn) {
      return NextResponse.json(
        { error: 'A real-estate buy-in is already pending review. Please wait for decision.' },
        { status: 409 }
      )
    }

    const summary = await getAccountBalanceSummary(user.id)
    if (summary.availableToSpendUsd < minimumUsd) {
      return NextResponse.json(
        { error: `Insufficient account balance. Available: $${summary.availableToSpendUsd.toFixed(2)}.` },
        { status: 400 }
      )
    }

    const prices = await getTrackedCryptoPricesUsd()
    const assetSummary = await getAccountBalanceAssetSummary(user.id, prices)
    const selectedCoin = [...TRACKED_ASSET_COINS]
      .sort((a, b) => (assetSummary.byCoin[b]?.netUsd ?? 0) - (assetSummary.byCoin[a]?.netUsd ?? 0))
      .find(coin => (assetSummary.byCoin[coin]?.netUsd ?? 0) >= minimumUsd)

    if (!selectedCoin) {
      return NextResponse.json({ error: 'No funded wallet has enough balance for this purchase.' }, { status: 400 })
    }

    const amountCrypto = convertUsdToCoin(minimumUsd, selectedCoin, prices)
    if (amountCrypto <= 0) {
      return NextResponse.json({ error: `Unable to resolve ${selectedCoin} conversion rate.` }, { status: 400 })
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: user.id,
        subject: `${REAL_ESTATE_BUY_IN_TICKET_PREFIX} ${title} (${tier})`,
        status: 'waiting',
      },
    })

    const bodyLines = [
      `Property: ${title}`,
      `Location: ${location}`,
      `Tier: ${tier}`,
      `Minimum: $${minimumUsd.toFixed(2)}`,
      `Duration: ${duration}`,
      `Payout Model: ${payoutModel}`,
      `Projected Band: ${projectedBand}`,
      `Illustrative Outcome: ${illustrativeOutcome}`,
      `Payment Coin: ${selectedCoin}`,
      `TXID: Account Balance`,
      'Request: Real-estate buy-in submitted from account balance. Please review and approve.',
    ]

    await prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        senderUserId: user.id,
        senderRole: 'user',
        body: bodyLines.join('\n'),
      },
    })

    const referenceId = `real-estate-buy-in:${ticket.id}`
    const alreadyDebited = await hasSettledEntryForReference(user.id, referenceId, 'debit')
    if (!alreadyDebited) {
      await createAccountBalanceEntry({
        userId: user.id,
        direction: 'debit',
        status: 'pending',
        amountUsd: minimumUsd,
        source: 'real_estate_buy_in',
        referenceId,
        note: `Real-estate buy-in submitted for ${title}.`,
        metadata: {
          ticketId: ticket.id,
          propertyId,
          coinType: selectedCoin,
          amountCrypto,
          usdPriceAtRequest: prices[selectedCoin],
        },
      })
    }

    await logUserActivity({
      userId: user.id,
      action: 'RealEstateBuyInSubmitted',
      detail: `Real-estate buy-in submitted from account balance for ${title} (${tier}).`,
    })

    return NextResponse.json({
      success: true,
      ticketId: ticket.id,
      message: 'Real-estate buy-in submitted for review.',
    })
  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Pay real-estate buy-in from account balance error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
