import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

type ClerkWebhookBody = {
  type?: string
  data?: {
    id?: string
    first_name?: string | null
    last_name?: string | null
    email_addresses?: Array<{ email_address?: string | null }>
  }
}

function parseUser(body: ClerkWebhookBody) {
  const id = body.data?.id?.trim() || ''
  const email = (body.data?.email_addresses?.[0]?.email_address || '').trim().toLowerCase()
  const firstName = (body.data?.first_name || '').trim()
  const lastName = (body.data?.last_name || '').trim()
  const fullName = `${firstName} ${lastName}`.trim() || null
  return { id, email, fullName }
}

async function createOrAttachUser(clerkUserId: string, email: string, fullName: string | null) {
  if (!clerkUserId || !email) return null

  const byClerkId = await prisma.user.findUnique({
    where: { clerkUserId },
  })

  if (byClerkId) {
    return prisma.user.update({
      where: { id: byClerkId.id },
      data: { email, fullName },
    })
  }

  const byEmail = await prisma.user.findUnique({
    where: { email },
  })

  if (byEmail) {
    return prisma.user.update({
      where: { id: byEmail.id },
      data: {
        clerkUserId,
        fullName,
      },
    })
  }

  return prisma.user.create({
    data: {
      clerkUserId,
      email,
      fullName,
      role: 'user',
      accountStatus: 'inactive',
    },
  })
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ClerkWebhookBody
    const eventType = body.type || ''

    if (eventType === 'user.created') {
      const { id, email, fullName } = parseUser(body)
      const user = await createOrAttachUser(id, email, fullName)
      return NextResponse.json({ success: true, userId: user?.id ?? null })
    }

    if (eventType === 'user.updated') {
      const { id, email, fullName } = parseUser(body)
      if (!id || !email) {
        return NextResponse.json({ success: true })
      }

      const existing = await prisma.user.findUnique({
        where: { clerkUserId: id },
      })

      if (existing) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { email, fullName },
        })
      } else {
        await createOrAttachUser(id, email, fullName)
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}
