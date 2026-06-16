import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { isSupportedLanguage } from '@/lib/i18n'
import { isSupportedCurrency } from '@/lib/forex'
import {
  isInputValidationError,
  readJsonObject,
  readStringField,
} from '@/lib/requestValidation'

const UPDATE_PREFERENCES_ALLOWED_FIELDS = ['preferredLanguage', 'preferredCurrency'] as const

export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await readJsonObject(req, { allowedKeys: UPDATE_PREFERENCES_ALLOWED_FIELDS })
    const preferredLanguage = readStringField(body, 'preferredLanguage', {
      toLowerCase: true,
      maxLength: 10,
    })
    const preferredCurrency = readStringField(body, 'preferredCurrency', {
      toUpperCase: true,
      maxLength: 10,
    })

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
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Update preferences error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
