import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import {
  AccountFreezeError,
  assertIncomingAllowed,
  assertMetricAllowed,
  getAccountFreezeSettings,
  logAccountFreezeTableMissing,
} from '@/lib/account-freeze'
import { logUserActivity } from '@/lib/user-activity'
import { createAccountBalanceEntry, getAccountBalanceEntries } from '@/lib/account-balance'
import { convertUsdToCoin, getTrackedCryptoPricesUsd, isTrackedAssetCoin } from '@/lib/crypto-prices'
import {
  REAL_ESTATE_BUY_IN_TICKET_PREFIX,
  REAL_ESTATE_WITHDRAWAL_TICKET_PREFIX,
} from '@/lib/real-estate-dashboard'
import {
  isInputValidationError,
  readJsonObject,
  readNumberField,
  readStringField,
} from '@/lib/requestValidation'
import {
  sendRealEstateBuyInReviewedEmail,
  sendRealEstateWithdrawalReviewedEmail,
} from '@/lib/transactional-email'

const ALLOWED_STATUSES = ['open', 'waiting', 'closed', 'rejected']
const ADMIN_SUPPORT_TICKET_FIELDS = ['ticketId', 'status'] as const

const parseLabel = (body: string, label: string) => {
  const regex = new RegExp(`^${label}:\\s*(.+)$`, 'im')
  const match = body.match(regex)
  return match?.[1]?.trim() ?? ''
}

const parseAmount = (value: string) => {
  const num = Number(value.replace(/[^0-9.]/g, ''))
  return Number.isFinite(num) ? num : 0
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

export async function PATCH(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const actor = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    })

    if (!actor || actor.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await readJsonObject(req, { allowedKeys: ADMIN_SUPPORT_TICKET_FIELDS })
    const ticketId = readNumberField(body, 'ticketId', { required: true, integer: true, min: 1 })!
    const status = readStringField(body, 'status', {
      required: true,
      enumValues: ALLOWED_STATUSES,
    })!

    const existingTicket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, userId: true, subject: true, status: true },
    })
    if (!existingTicket) {
      return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 })
    }

    const ticketOwner = await prisma.user.findUnique({
      where: { id: existingTicket.userId },
      select: { email: true, fullName: true },
    })

    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status,
        lastMessageAt: new Date(),
      },
    })

    await prisma.adminActivityLog.create({
      data: {
        actorAdminId: actor.id,
        targetUserId: ticket.userId,
        action: 'SupportTicketUpdated',
        detail: `Ticket #${ticket.id} (${ticket.subject}) status set to ${status}.`,
      },
    })

    const isRealEstateBuyIn = ticket.subject.startsWith(REAL_ESTATE_BUY_IN_TICKET_PREFIX)
    const isRealEstateWithdrawal = ticket.subject.startsWith(REAL_ESTATE_WITHDRAWAL_TICKET_PREFIX)
    if (isRealEstateBuyIn) {
      const referenceId = `real-estate-buy-in:${ticket.id}`
      const relatedEntries = await getAccountBalanceEntries(ticket.userId, { limit: 2000 })
      const latestRelatedEntry = relatedEntries
        .filter(entry => entry.referenceId === referenceId && entry.source === 'real_estate_buy_in')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]

      if (latestRelatedEntry && status !== existingTicket.status) {
        if (status === 'closed' && latestRelatedEntry.status !== 'settled') {
          await createAccountBalanceEntry({
            userId: ticket.userId,
            direction: 'debit',
            status: 'settled',
            amountUsd: latestRelatedEntry.amountUsd,
            source: 'real_estate_buy_in',
            referenceId,
            note: 'Real-estate buy-in approved.',
            metadata: latestRelatedEntry.metadata,
          })
        } else if (status === 'rejected' && latestRelatedEntry.status !== 'rejected') {
          await createAccountBalanceEntry({
            userId: ticket.userId,
            direction: 'debit',
            status: 'rejected',
            amountUsd: latestRelatedEntry.amountUsd,
            source: 'real_estate_buy_in',
            referenceId,
            note: 'Real-estate buy-in rejected.',
            metadata: latestRelatedEntry.metadata,
          })
        } else if ((status === 'open' || status === 'waiting') && latestRelatedEntry.status !== 'pending') {
          await createAccountBalanceEntry({
            userId: ticket.userId,
            direction: 'debit',
            status: 'pending',
            amountUsd: latestRelatedEntry.amountUsd,
            source: 'real_estate_buy_in',
            referenceId,
            note: status === 'waiting' ? 'Real-estate buy-in under review.' : 'Real-estate buy-in reopened.',
            metadata: latestRelatedEntry.metadata,
          })
        }
      }

      if (status === 'closed') {
        await logUserActivity({
          userId: ticket.userId,
          action: 'RealEstateBuyInApproved',
          detail: `Real estate buy-in approved.`,
        })
      } else if (status === 'waiting') {
        await logUserActivity({
          userId: ticket.userId,
          action: 'RealEstateBuyInUnderReview',
          detail: `Real estate buy-in under review.`,
        })
      } else if (status === 'rejected') {
        await logUserActivity({
          userId: ticket.userId,
          action: 'RealEstateBuyInRejected',
          detail: `Real estate buy-in rejected.`,
        })
      } else if (status === 'open') {
        await logUserActivity({
          userId: ticket.userId,
          action: 'RealEstateBuyInReopened',
          detail: `Real estate buy-in reopened.`,
        })
      }

      if (
        ticketOwner?.email &&
        status !== existingTicket.status &&
        (status === 'closed' || status === 'rejected') &&
        latestRelatedEntry
      ) {
        const { propertyTitle, tierName } = parseBuyInSubject(ticket.subject)
        await sendRealEstateBuyInReviewedEmail({
          to: ticketOwner.email,
          fullName: ticketOwner.fullName,
          propertyTitle,
          tierName,
          amountUsd: latestRelatedEntry.amountUsd,
          referenceId,
          decision: status === 'closed' ? 'approve' : 'reject',
        })
      }
    } else if (isRealEstateWithdrawal) {
      const referenceId = `real-estate-withdrawal:${ticket.id}`
      const relatedEntries = await getAccountBalanceEntries(ticket.userId, { limit: 2000 })
      const latestRelatedEntry = relatedEntries
        .filter(entry => entry.referenceId === referenceId && entry.source === 'real_estate_withdrawal')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]

      const userMessage = await prisma.supportMessage.findFirst({
        where: {
          ticketId: ticket.id,
          senderRole: 'user',
        },
        orderBy: { createdAt: 'desc' },
        select: { body: true },
      })

      const bodyText = userMessage?.body || ''
      const requestedAmountUsd = parseAmount(
        parseLabel(bodyText, 'Requested Amount USD') || parseLabel(bodyText, 'Amount')
      )
      const rawCoinType =
        (parseLabel(bodyText, 'Coin') ||
          parseLabel(bodyText, 'Payout Coin') ||
          parseLabel(bodyText, 'Payment Coin') ||
          'USDT').toUpperCase()
      const coinType = isTrackedAssetCoin(rawCoinType) ? rawCoinType : 'USDT'
      const method = parseLabel(bodyText, 'Method') || parseLabel(bodyText, 'Payout Method') || null
      const destination = parseLabel(bodyText, 'Destination') || parseLabel(bodyText, 'Wallet') || null
      const prices = status === 'closed' ? await getTrackedCryptoPricesUsd() : null
      const amountCrypto =
        status === 'closed' && requestedAmountUsd > 0 && prices
          ? convertUsdToCoin(requestedAmountUsd, coinType, prices)
          : undefined

      if (requestedAmountUsd > 0 && status !== existingTicket.status) {
        if (status === 'closed' && latestRelatedEntry?.status !== 'settled') {
          const freezeQuery = await getAccountFreezeSettings(ticket.userId)
          if (freezeQuery.tableMissing) {
            logAccountFreezeTableMissing('api/admin/support/tickets:PATCH')
          } else {
            assertMetricAllowed({
              settings: freezeQuery.settings,
              metric: 'earnings',
              context: 'real-estate withdrawal settlement',
            })
            assertIncomingAllowed({
              settings: freezeQuery.settings,
              coinType,
              context: 'real-estate withdrawal settlement',
            })
          }

          await createAccountBalanceEntry({
            userId: ticket.userId,
            direction: 'credit',
            status: 'settled',
            amountUsd: requestedAmountUsd,
            source: 'real_estate_withdrawal',
            referenceId,
            note: 'Real-estate withdrawal approved and credited to account balance.',
            metadata: {
              ticketId: ticket.id,
              coinType,
              amountCrypto,
              usdPriceAtSettlement: prices?.[coinType],
              method,
              destination,
            },
          })
        } else if (status === 'rejected' && latestRelatedEntry?.status !== 'rejected') {
          await createAccountBalanceEntry({
            userId: ticket.userId,
            direction: 'credit',
            status: 'rejected',
            amountUsd: requestedAmountUsd,
            source: 'real_estate_withdrawal',
            referenceId,
            note: 'Real-estate withdrawal rejected.',
            metadata: {
              ticketId: ticket.id,
              coinType,
              method,
              destination,
            },
          })
        }
      }

      if (
        requestedAmountUsd > 0 &&
        status === 'rejected' &&
        ['closed'].includes(existingTicket.status)
      ) {
        const reversalReference = `real-estate-withdrawal-reversal:${ticket.id}`
        const hasReversal = relatedEntries.some(
          entry =>
            entry.referenceId === reversalReference &&
            entry.source === 'withdrawal_reversal' &&
            entry.direction === 'debit' &&
            entry.status === 'settled'
        )
        if (!hasReversal) {
          await createAccountBalanceEntry({
            userId: ticket.userId,
            direction: 'debit',
            status: 'settled',
            amountUsd: requestedAmountUsd,
            source: 'withdrawal_reversal',
            referenceId: reversalReference,
            note: 'Real-estate withdrawal credit reversed after rejection.',
            metadata: {
              ticketId: ticket.id,
              coinType,
              method,
              destination,
            },
          })
        }
      }

      if (status === 'closed') {
        await logUserActivity({
          userId: ticket.userId,
          action: 'RealEstateWithdrawalPaid',
          detail: `Real estate withdrawal approved.`,
        })
      } else if (status === 'waiting') {
        await logUserActivity({
          userId: ticket.userId,
          action: 'RealEstateWithdrawalProcessing',
          detail: `Real estate withdrawal processing.`,
        })
      } else if (status === 'rejected') {
        await logUserActivity({
          userId: ticket.userId,
          action: 'RealEstateWithdrawalRejected',
          detail: `Real estate withdrawal rejected.`,
        })
      } else if (status === 'open') {
        await logUserActivity({
          userId: ticket.userId,
          action: 'RealEstateWithdrawalReopened',
          detail: `Real estate withdrawal reopened.`,
        })
      }

      if (
        ticketOwner?.email &&
        requestedAmountUsd > 0 &&
        status !== existingTicket.status &&
        (status === 'closed' || status === 'rejected')
      ) {
        await sendRealEstateWithdrawalReviewedEmail({
          to: ticketOwner.email,
          fullName: ticketOwner.fullName,
          subject: ticket.subject,
          amountUsd: requestedAmountUsd,
          coinType,
          referenceId,
          decision: status === 'closed' ? 'approve' : 'reject',
        })
      }
    } else if (status === 'closed') {
      await logUserActivity({
        userId: ticket.userId,
        action: 'SupportTicketClosed',
        detail: `Ticket closed: ${ticket.subject}.`,
      })
    } else if (status === 'open') {
      await logUserActivity({
        userId: ticket.userId,
        action: 'SupportTicketReopened',
        detail: `Ticket reopened: ${ticket.subject}.`,
      })
    } else if (status === 'rejected') {
      await logUserActivity({
        userId: ticket.userId,
        action: 'SupportTicketRejected',
        detail: `Ticket rejected: ${ticket.subject}.`,
      })
    }

    return NextResponse.json({ success: true, status })
  } catch (error) {
    if (error instanceof AccountFreezeError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Support ticket update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
