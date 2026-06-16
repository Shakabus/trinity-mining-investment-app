import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  isInputValidationError,
  readJsonObject,
  readStringField,
} from '@/lib/requestValidation'

const CONTACT_PREFIX = 'Contact Form:'
const CONTACT_INBOX_CLERK_ID = 'public_contact_inbox'
const CONTACT_INBOX_EMAIL = 'public-contact-inbox@system.trinity.local'
const MAX_BODY_LENGTH = 5000
const CONTACT_ALLOWED_FIELDS = ['fullName', 'email', 'phone', 'subject', 'message', 'sourcePage'] as const

export async function POST(req: Request) {
  try {
    const body = await readJsonObject(req, { allowedKeys: CONTACT_ALLOWED_FIELDS })
    const fullName = readStringField(body, 'fullName', {
      required: true,
      minLength: 2,
      maxLength: 120,
    })!
    const email = readStringField(body, 'email', {
      required: true,
      toLowerCase: true,
      maxLength: 254,
    })!
    const phone = readStringField(body, 'phone', {
      maxLength: 30,
      pattern: /^[+()\-.\s\d]*$/,
    })
    const subject =
      readStringField(body, 'subject', {
        maxLength: 140,
      }) || 'General inquiry'
    const message = readStringField(body, 'message', {
      required: true,
      minLength: 3,
      maxLength: MAX_BODY_LENGTH,
    })!
    const sourcePage =
      readStringField(body, 'sourcePage', {
        maxLength: 200,
      }) || '/contact'

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    if (phone && phone.replace(/\D/g, '').length > 0 && phone.replace(/\D/g, '').length < 7) {
      return NextResponse.json({ error: 'Phone number must include at least 7 digits.' }, { status: 400 })
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
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Public contact message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
