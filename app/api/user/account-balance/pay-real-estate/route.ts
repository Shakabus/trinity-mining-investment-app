import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import {
  AccountFreezeError,
  applyOutgoingCoinFreezesToAvailability,
  assertMetricAllowed,
  assertOutgoingAllowed,
  getAccountFreezeSettings,
  logAccountFreezeTableMissing,
} from '@/lib/account-freeze'
import {
  createAccountBalanceEntry,
  getAccountBalanceCoinAvailability,
  getAccountBalanceEntries,
  getAccountBalanceSummary,
  lockUserBalanceForUpdate,
} from '@/lib/account-balance'
import {
  TRACKED_ASSET_COINS,
  convertUsdToCoin,
  getTrackedCryptoPricesUsd,
} from '@/lib/crypto-prices'
import { REAL_ESTATE_BUY_IN_TICKET_PREFIX } from '@/lib/real-estate-dashboard'
import { logUserActivity } from '@/lib/user-activity'
import {
  sendRealEstateBuyInSubmittedEmail,
  sendSupportInboxAlertEmail,
} from '@/lib/transactional-email'
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

class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
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
      select: { id: true, email: true, fullName: true },
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

    const prices = await getTrackedCryptoPricesUsd()
    const ticket = await prisma.$transaction(async (tx: any) => {
      await lockUserBalanceForUpdate(user.id, tx)

      const summary = await getAccountBalanceSummary(user.id, tx)
      if (summary.availableToSpendUsd < minimumUsd) {
        throw new HttpError(
          400,
          `Insufficient account balance. Available: $${summary.availableToSpendUsd.toFixed(2)}.`
        )
      }

      const freezeQuery = await getAccountFreezeSettings(user.id, tx)
      if (freezeQuery.tableMissing) {
        logAccountFreezeTableMissing('api/user/account-balance/pay-real-estate:POST')
      } else {
        assertMetricAllowed({
          settings: freezeQuery.settings,
          metric: 'spendable',
          context: 'real-estate buy-in payment',
        })
        assertMetricAllowed({
          settings: freezeQuery.settings,
          metric: 'wallets',
          context: 'real-estate buy-in payment',
        })
        assertOutgoingAllowed({
          settings: freezeQuery.settings,
          amountUsd: minimumUsd,
          availableUsd: summary.availableToSpendUsd,
          context: 'real-estate buy-in payment',
        })
      }

      const rawCoinAvailability = await getAccountBalanceCoinAvailability(user.id, prices, tx)
      const coinAvailability = freezeQuery.tableMissing
        ? rawCoinAvailability
        : applyOutgoingCoinFreezesToAvailability(rawCoinAvailability, freezeQuery.settings, prices)
      const selectedCoin = [...TRACKED_ASSET_COINS]
        .sort(
          (a, b) =>
            (coinAvailability.byCoin[b]?.availableUsd ?? 0) -
            (coinAvailability.byCoin[a]?.availableUsd ?? 0)
        )
        .find(coin => (coinAvailability.byCoin[coin]?.availableUsd ?? 0) >= minimumUsd)

      if (!selectedCoin) {
        throw new HttpError(400, 'No funded wallet has enough available balance for this purchase.')
      }

      const amountCrypto = convertUsdToCoin(minimumUsd, selectedCoin, prices)
      if (amountCrypto <= 0) {
        throw new HttpError(400, `Unable to resolve ${selectedCoin} conversion rate.`)
      }

      const newTicket = await tx.supportTicket.create({
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

      await tx.supportMessage.create({
        data: {
          ticketId: newTicket.id,
          senderUserId: user.id,
          senderRole: 'user',
          body: bodyLines.join('\n'),
        },
      })

      const referenceId = `real-estate-buy-in:${newTicket.id}`
      const existingEntries = await getAccountBalanceEntries(user.id, { limit: 3000 }, tx)
      const latestPaymentEntry = existingEntries
        .filter(
          entry =>
            entry.referenceId === referenceId &&
            entry.source === 'real_estate_buy_in' &&
            entry.direction === 'debit'
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]

      if (latestPaymentEntry?.status === 'pending') {
        throw new HttpError(409, 'This real-estate buy-in payment is already pending review.')
      }
      if (latestPaymentEntry?.status === 'settled') {
        throw new HttpError(409, 'This real-estate buy-in has already been funded from account balance.')
      }

      await createAccountBalanceEntry(
        {
          userId: user.id,
          direction: 'debit',
          status: 'pending',
          amountUsd: minimumUsd,
          source: 'real_estate_buy_in',
          referenceId,
          note: `Real-estate buy-in submitted for ${title}.`,
          metadata: {
            ticketId: newTicket.id,
            propertyId,
            coinType: selectedCoin,
            amountCrypto,
            usdPriceAtRequest: prices[selectedCoin],
          },
        },
        tx
      )

      return newTicket
    })

    await logUserActivity({
      userId: user.id,
      action: 'RealEstateBuyInSubmitted',
      detail: `Real-estate buy-in submitted from account balance for ${title} (${tier}).`,
    })

    if (user.email) {
      await sendRealEstateBuyInSubmittedEmail({
        to: user.email,
        fullName: user.fullName,
        propertyTitle: title,
        tierName: tier,
        amountUsd: minimumUsd,
        referenceId: `real-estate-buy-in:${ticket.id}`,
      })
    }

    await sendSupportInboxAlertEmail({
      subject: `Real-Estate Buy-In Request #${ticket.id}`,
      body: [
        `Ticket: #${ticket.id}`,
        `User ID: ${user.id}`,
        `User Email: ${user.email || 'no-email'}`,
        `Property: ${title}`,
        `Tier: ${tier}`,
        `Amount (USD): ${minimumUsd.toFixed(2)}`,
      ].join('\n'),
    })

    return NextResponse.json({
      success: true,
      ticketId: ticket.id,
      message: 'Real-estate buy-in submitted for review.',
    })
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
    console.error('Pay real-estate buy-in from account balance error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
