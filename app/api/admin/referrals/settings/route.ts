import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import {
  isInputValidationError,
  readBooleanField,
  readJsonObject,
  readNumberField,
} from '@/lib/requestValidation'

const REFERRAL_SETTINGS_FIELDS = ['isEnabled', 'bonusPercent', 'minPaymentUsd', 'minWithdrawalUsd'] as const

export async function PATCH(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUser = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    })

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await readJsonObject(req, { allowedKeys: REFERRAL_SETTINGS_FIELDS })
    const isEnabled = readBooleanField(body, 'isEnabled', { required: true })!
    const bonusPercent = readNumberField(body, 'bonusPercent', {
      required: true,
      min: 0,
      max: 100,
    })!
    const minPaymentUsd = readNumberField(body, 'minPaymentUsd', { required: true, min: 0 })!
    const minWithdrawalUsd = readNumberField(body, 'minWithdrawalUsd', { required: true, min: 0 })!

    const settings = await prisma.referralSettings.upsert({
      where: { id: 1 },
      update: {
        isEnabled,
        bonusPercent,
        minPaymentUsd,
        minWithdrawalUsd,
      },
      create: {
        id: 1,
        isEnabled,
        bonusPercent,
        minPaymentUsd,
        minWithdrawalUsd,
      },
    })

    return NextResponse.json({ success: true, settings })
  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Update referral settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
