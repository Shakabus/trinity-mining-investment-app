import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const CONTACT_PREFIX = 'Contact Form:'
const CONTACT_INBOX_CLERK_ID = 'public_contact_inbox'
const CONTACT_INBOX_EMAIL = 'public-contact-inbox@system.trinity.local'
const MAX_BODY_LENGTH = 5000

function cleanText(value: unknown) {
  return String(value || '').trim()
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const fullName = cleanText(body?.fullName)
    const email = cleanText(body?.email).toLowerCase()
    const phone = cleanText(body?.phone)
    const subject = cleanText(body?.subject) || 'General inquiry'
    const message = cleanText(body?.message)
    const sourcePage = cleanText(body?.sourcePage) || '/contact'

    if (!fullName || !email || !message) {
      return NextResponse.json(
        { error: 'Full name, email, and message are required.' },
        { status: 400 },
      )
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    if (message.length > MAX_BODY_LENGTH) {
      return NextResponse.json({ error: 'Message is too long.' }, { status: 400 })
    }

    let inboxUser = await prisma.user.findUnique({
      where: { clerkUserId: CONTACT_INBOX_CLERK_ID },
    })

    if (!inboxUser) {
      inboxUser = await prisma.user.create({
        data: {
          clerkUserId: CONTACT_INBOX_CLERK_ID,
          email: CONTACT_INBOX_EMAIL,
          fullName: 'Public Contact Inbox',
          accountStatus: 'active',
          role: 'user',
        },
      })
    }

    const structuredBody = [
      `Visitor Name: ${fullName}`,
      `Visitor Email: ${email}`,
      `Visitor Phone: ${phone || 'Not provided'}`,
      `Source Page: ${sourcePage}`,
      '',
      'Message:',
      message,
    ].join('\n')

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: inboxUser.id,
        subject: `${CONTACT_PREFIX} ${subject}`,
        status: 'open',
        lastMessageAt: new Date(),
        messages: {
          create: {
            senderUserId: inboxUser.id,
            senderRole: 'user',
            body: structuredBody,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      ticketId: ticket.id,
      message: 'Message sent successfully.',
    })
  } catch (error) {
    console.error('Public contact message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
