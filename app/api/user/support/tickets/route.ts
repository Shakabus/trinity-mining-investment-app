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
  readFormDataStrict,
  readFormFile,
  readFormString,
} from '@/lib/requestValidation'

const SUPPORT_TICKET_FIELDS = ['subject', 'message', 'file'] as const

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await readFormDataStrict(req, { allowedKeys: SUPPORT_TICKET_FIELDS })
    const subject = readFormString(formData, 'subject', { required: true, maxLength: 200 })!
    const message = readFormString(formData, 'message', { required: true, maxLength: 2000 })!
    const file = readFormFile(formData, 'file', {
      maxBytes: 5 * 1024 * 1024,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    })

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    if (subject.startsWith(REAL_ESTATE_BUY_IN_TICKET_PREFIX)) {
      const existingPendingBuyIn = await prisma.supportTicket.findFirst({
        where: {
          userId: user.id,
          subject: {
            startsWith: REAL_ESTATE_BUY_IN_TICKET_PREFIX,
          },
          status: {
            notIn: ['closed', 'rejected'],
          },
        },
      })

      if (existingPendingBuyIn) {
        return NextResponse.json(
          {
            error:
              'You already have a pending real-estate buy-in verification. It must be approved before you submit another property buy-in.',
          },
          { status: 409 },
        )
      }
    }

    if (subject.startsWith(REAL_ESTATE_WITHDRAWAL_TICKET_PREFIX)) {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      const recentWithdrawalRequest = await prisma.supportTicket.findFirst({
        where: {
          userId: user.id,
          subject: {
            startsWith: REAL_ESTATE_WITHDRAWAL_TICKET_PREFIX,
          },
          createdAt: {
            gte: sixMonthsAgo,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      if (recentWithdrawalRequest) {
        return NextResponse.json(
          {
            error:
              'Real-estate withdrawals are limited to one request every 6 months. Your next request window will open after the current cooldown.',
          },
          { status: 409 },
        )
      }
    }

    let attachmentData: {
      attachmentUrl?: string | null
      attachmentName?: string | null
      attachmentType?: string | null
      attachmentSize?: number | null
    } | null = null

    if (file) {
      const { randomUUID } = await import('crypto')
      const { mkdir, writeFile } = await import('fs/promises')
      const path = await import('path')

      const buffer = Buffer.from(await file.arrayBuffer())
      const extension = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1] || 'bin'
      const filename = `support_${user.id}_${randomUUID()}.${extension}`
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'support')
      await mkdir(uploadDir, { recursive: true })
      await writeFile(path.join(uploadDir, filename), buffer)

      attachmentData = {
        attachmentUrl: `/uploads/support/${filename}`,
        attachmentName: file.name,
        attachmentType: file.type,
        attachmentSize: file.size,
      }
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: user.id,
        subject,
        status: 'open',
        lastMessageAt: new Date(),
        messages: {
          create: {
            senderUserId: user.id,
            senderRole: 'user',
            body: message,
            ...(attachmentData || {}),
          },
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    const isRealEstateBuyIn = subject.startsWith(REAL_ESTATE_BUY_IN_TICKET_PREFIX)
    const isRealEstateWithdrawal = subject.startsWith(REAL_ESTATE_WITHDRAWAL_TICKET_PREFIX)

    if (isRealEstateBuyIn) {
      await logUserActivity({
        userId: user.id,
        action: 'RealEstateBuyInSubmitted',
        detail: `Real-estate buy-in proof submitted: ${subject.replace(REAL_ESTATE_BUY_IN_TICKET_PREFIX, '').trim() || subject}.`,
      })
    } else if (isRealEstateWithdrawal) {
      await logUserActivity({
        userId: user.id,
        action: 'RealEstateWithdrawalRequested',
        detail: `Real-estate withdrawal request submitted: ${subject.replace(REAL_ESTATE_WITHDRAWAL_TICKET_PREFIX, '').trim() || subject}.`,
      })
    } else {
      await logUserActivity({
        userId: user.id,
        action: 'SupportTicketCreated',
        detail: `New support request created: ${subject}.`,
      })
    }

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        createdAt: ticket.createdAt.toISOString(),
        lastMessageAt: ticket.lastMessageAt ? ticket.lastMessageAt.toISOString() : null,
        messages: ticket.messages.map(msg => ({
          id: msg.id,
          senderRole: msg.senderRole,
          body: msg.body,
          attachmentUrl: msg.attachmentUrl,
          attachmentName: msg.attachmentName,
          attachmentType: msg.attachmentType,
          createdAt: msg.createdAt.toISOString(),
        })),
      },
    })
  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Create support ticket error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
