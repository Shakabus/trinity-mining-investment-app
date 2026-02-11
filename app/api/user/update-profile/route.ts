import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { logUserActivity } from '@/lib/user-activity'
import { isSupportedCurrency } from '@/lib/forex'
import { isSupportedLanguage } from '@/lib/i18n'
import {
  isInputValidationError,
  readJsonObject,
  readStringField,
} from '@/lib/requestValidation'

const UPDATE_PROFILE_ALLOWED_FIELDS = [
  'fullName',
  'phone',
  'preferredCurrency',
  'preferredLanguage',
] as const

export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await readJsonObject(req, { allowedKeys: UPDATE_PROFILE_ALLOWED_FIELDS })
    const fullName = readStringField(body, 'fullName', {
      required: true,
      minLength: 2,
      maxLength: 80,
    })!
    const phone = readStringField(body, 'phone', { maxLength: 30 }) || ''
    const preferredCurrency =
      readStringField(body, 'preferredCurrency', {
        toUpperCase: true,
        maxLength: 10,
      }) || 'USD'
    const preferredLanguage = readStringField(body, 'preferredLanguage', {
      toLowerCase: true,
      maxLength: 10,
    })

    if (phone.length > 0) {
      if (phone.length < 7) {
        return NextResponse.json({ error: 'Phone number looks too short.' }, { status: 400 })
      }
      if (phone.length > 30) {
        return NextResponse.json({ error: 'Phone number is too long.' }, { status: 400 })
      }
      if (!/^[+()\-.\s\d]+$/.test(phone)) {
        return NextResponse.json({ error: 'Phone number contains invalid characters.' }, { status: 400 })
      }
      const digitCount = phone.replace(/\D/g, '').length
      if (digitCount < 7) {
        return NextResponse.json({ error: 'Phone number must include at least 7 digits.' }, { status: 400 })
      }
    }

    if (!isSupportedCurrency(preferredCurrency)) {
      return NextResponse.json({ error: 'Unsupported currency selection.' }, { status: 400 })
    }
    if (preferredLanguage && !isSupportedLanguage(preferredLanguage)) {
      return NextResponse.json({ error: 'Unsupported language selection.' }, { status: 400 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    })

    await prisma.user.update({
      where: { clerkUserId: userId },
      data: {
        fullName: fullName,
        phone: phone.length > 0 ? phone : null,
        preferredCurrency,
        preferredLanguage: preferredLanguage || undefined,
      },
    })

    if (currentUser) {
      const changedFields: string[] = []
      if ((currentUser.fullName || '') !== (fullName.length > 0 ? fullName : '')) {
        changedFields.push('full name')
      }
      if ((currentUser.phone || '') !== (phone.length > 0 ? phone : '')) {
        changedFields.push('phone')
      }
      if ((currentUser.preferredCurrency || 'USD') !== preferredCurrency) {
        changedFields.push('currency')
      }
      if (preferredLanguage && (currentUser.preferredLanguage || 'en') !== preferredLanguage) {
        changedFields.push('language')
      }

      if (changedFields.length > 0) {
        await logUserActivity({
          userId: currentUser.id,
          action: 'ProfileUpdated',
          detail: `Updated ${changedFields.join(', ')}.`,
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Update profile error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
