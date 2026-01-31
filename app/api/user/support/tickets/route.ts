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

    const formData = await req.formData()
    const subject = String(formData.get('subject') || '').trim()
    const message = String(formData.get('message') || '').trim()
    const file = formData.get('file') as File | null

    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required.' }, { status: 400 })
    }

    if (subject.length > 200 || message.length > 2000) {
      return NextResponse.json({ error: 'Message is too long.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    let attachmentData: {
      attachmentUrl?: string | null
      attachmentName?: string | null
      attachmentType?: string | null
      attachmentSize?: number | null
    } | null = null

    if (file) {
      const maxSize = 5 * 1024 * 1024
      const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
      if (!allowed.has(file.type)) {
        return NextResponse.json({ error: 'Unsupported file type.' }, { status: 400 })
      }
      if (file.size > maxSize) {
        return NextResponse.json({ error: 'File must be under 5MB.' }, { status: 400 })
      }

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

    await logUserActivity({
      userId: user.id,
      action: 'SupportTicketCreated',
      detail: `New support request created: ${subject}.`,
    })

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
    console.error('Create support ticket error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
