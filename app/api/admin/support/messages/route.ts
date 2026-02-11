import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { logUserActivity } from '@/lib/user-activity'
import {
  isInputValidationError,
  readJsonObject,
  readNumberField,
  readStringField,
} from '@/lib/requestValidation'

const ADMIN_SUPPORT_MESSAGE_FIELDS = ['ticketId', 'message'] as const

export async function POST(req: Request) {
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

    const body = await readJsonObject(req, { allowedKeys: ADMIN_SUPPORT_MESSAGE_FIELDS })
    const ticketId = readNumberField(body, 'ticketId', { required: true, integer: true, min: 1 })!
    const message = readStringField(body, 'message', { required: true, maxLength: 2000 })!

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { user: true },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 })
    }

    const newMessage = await prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        senderUserId: actor.id,
        senderRole: 'support',
        body: message,
      },
    })

    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: 'waiting',
        lastMessageAt: new Date(),
      },
    })

    await prisma.adminActivityLog.create({
      data: {
        actorAdminId: actor.id,
        targetUserId: ticket.userId,
        action: 'SupportReplySent',
        detail: `Replied to ticket #${ticket.id}.`,
      },
    })

    await logUserActivity({
      userId: ticket.userId,
      action: 'SupportReplyReceived',
      detail: `New reply on: ${ticket.subject}.`,
    })

    return NextResponse.json({
      success: true,
      status: 'waiting',
      message: {
        id: newMessage.id,
        senderRole: newMessage.senderRole,
        body: newMessage.body,
        createdAt: newMessage.createdAt.toISOString(),
      },
    })
  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Support reply error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
