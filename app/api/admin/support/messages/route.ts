import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { logUserActivity } from '@/lib/user-activity'

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

    const body = await req.json()
    const ticketId = Number(body?.ticketId)
    const message = String(body?.message || '').trim()

    if (!ticketId || Number.isNaN(ticketId)) {
      return NextResponse.json({ error: 'Invalid ticket.' }, { status: 400 })
    }

    if (!message) {
      return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 })
    }

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
    console.error('Support reply error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
