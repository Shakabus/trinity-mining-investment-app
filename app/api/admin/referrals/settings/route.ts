import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

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

    const body = await req.json()
    const isEnabled = Boolean(body?.isEnabled)
    const bonusPercent = Number(body?.bonusPercent)
    const minPaymentUsd = Number(body?.minPaymentUsd)
    const minWithdrawalUsd = Number(body?.minWithdrawalUsd)

    if (!Number.isFinite(bonusPercent) || bonusPercent < 0 || bonusPercent > 100) {
      return NextResponse.json({ error: 'Bonus percent must be between 0 and 100.' }, { status: 400 })
    }

    if (!Number.isFinite(minPaymentUsd) || minPaymentUsd < 0) {
      return NextResponse.json({ error: 'Minimum payment must be a positive number.' }, { status: 400 })
    }

    if (!Number.isFinite(minWithdrawalUsd) || minWithdrawalUsd < 0) {
      return NextResponse.json({ error: 'Minimum withdrawal must be a positive number.' }, { status: 400 })
    }

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
    console.error('Update referral settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
