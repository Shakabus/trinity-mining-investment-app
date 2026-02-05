import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { isSupportedLanguage } from '@/lib/i18n'
import { isSupportedCurrency } from '@/lib/forex'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const preferredLanguage =
      typeof body.preferredLanguage === 'string' ? body.preferredLanguage.trim().toLowerCase() : undefined
    const preferredCurrency =
      typeof body.preferredCurrency === 'string' ? body.preferredCurrency.trim().toUpperCase() : undefined

    if (preferredLanguage && !isSupportedLanguage(preferredLanguage)) {
      return NextResponse.json({ error: 'Unsupported language selection.' }, { status: 400 })
    }
    if (preferredCurrency && !isSupportedCurrency(preferredCurrency)) {
      return NextResponse.json({ error: 'Unsupported currency selection.' }, { status: 400 })
    }

    await prisma.user.update({
      where: { clerkUserId: userId },
      data: {
        preferredLanguage: preferredLanguage || undefined,
        preferredCurrency: preferredCurrency || undefined,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update preferences error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
