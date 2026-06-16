import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import {
  deactivateAdminPushSubscription,
  getAdminPushConfig,
  upsertAdminPushSubscription,
  type AdminPushSubscriptionInput,
} from '@/lib/admin-push'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

function readString(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return ''
  const normalized = value.trim()
  if (!normalized) return ''
  return normalized.slice(0, maxLength)
}

function parseSubscription(input: unknown): AdminPushSubscriptionInput | null {
  if (!input || typeof input !== 'object') return null
  const data = input as Record<string, unknown>
  const endpoint = readString(data.endpoint, 700)
  if (!endpoint) return null

  const keysInput = data.keys
  if (!keysInput || typeof keysInput !== 'object') return null
  const keys = keysInput as Record<string, unknown>
  const p256dh = readString(keys.p256dh, 255)
  const auth = readString(keys.auth, 255)
  if (!p256dh || !auth) return null

  return {
    endpoint,
    keys: { p256dh, auth },
  }
}

async function requireAdmin() {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) return null

  const adminUser = await prisma.user.findUnique({
    where: { clerkUserId },
    select: { id: true, role: true },
  })
  if (!adminUser || adminUser.role !== 'admin') return null
  return adminUser
}

export async function GET() {
  try {
    const adminUser = await requireAdmin()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const config = getAdminPushConfig()
    return NextResponse.json({
      enabled: config.enabled,
      publicKey: config.publicKey || null,
    })
  } catch (error) {
    console.error('Admin push subscriptions config error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await requireAdmin()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const config = getAdminPushConfig()
    if (!config.enabled) {
      return NextResponse.json({ error: 'Web push is not configured.' }, { status: 503 })
    }

    const body = (await request.json().catch(() => null)) as
      | { subscription?: unknown }
      | null
    const subscription = parseSubscription(body?.subscription)
    if (!subscription) {
      return NextResponse.json({ error: 'Invalid subscription payload.' }, { status: 400 })
    }

    const userAgent = readString(request.headers.get('user-agent'), 512) || null
    const upserted = await upsertAdminPushSubscription({
      adminUserId: adminUser.id,
      subscription,
      userAgent,
    })

    if (!upserted) {
      return NextResponse.json(
        {
          error: 'Push subscriptions are unavailable until database migration is applied.',
          code: 'PUSH_SUBSCRIPTIONS_TABLE_MISSING',
        },
        { status: 503 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin push subscriptions upsert error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const adminUser = await requireAdmin()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as
      | { endpoint?: unknown }
      | null
    const endpoint = readString(body?.endpoint, 700)
    if (!endpoint) {
      return NextResponse.json({ error: 'Valid endpoint is required.' }, { status: 400 })
    }

    await deactivateAdminPushSubscription({
      adminUserId: adminUser.id,
      endpoint,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin push subscriptions delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
