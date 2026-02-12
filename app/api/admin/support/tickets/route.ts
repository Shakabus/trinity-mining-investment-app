import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { logUserActivity } from '@/lib/user-activity'
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

const ALLOWED_STATUSES = ['open', 'waiting', 'closed', 'rejected']
const ADMIN_SUPPORT_TICKET_FIELDS = ['ticketId', 'status'] as const

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
    } else if (isRealEstateWithdrawal) {
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
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Support ticket update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
