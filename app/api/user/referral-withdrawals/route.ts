import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { convertUsdToCoin, getTrackedCryptoPricesUsd } from '@/lib/crypto-prices'
import { logUserActivity } from '@/lib/user-activity'
import {
  isInputValidationError,
  readJsonObject,
  readNumberField,
  readStringField,
} from '@/lib/requestValidation'

const DEFAULT_REFERRAL_SETTINGS = {
  isEnabled: true,
  minWithdrawalUsd: 50,
}

const SUPPORTED_COINS = ['BTC', 'USDT', 'SOL'] as const
const REFERRAL_WITHDRAWAL_ALLOWED_FIELDS = ['coinType', 'amountUsd'] as const

export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await readJsonObject(req, { allowedKeys: REFERRAL_WITHDRAWAL_ALLOWED_FIELDS })
    const coinType = readStringField(body, 'coinType', {
      required: true,
      toUpperCase: true,
      enumValues: SUPPORTED_COINS,
    }) as (typeof SUPPORTED_COINS)[number]
    const amountUsd = readNumberField(body, 'amountUsd', { required: true, min: 0.01 })!

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      include: {
        referralBonuses: true,
        referralWithdrawals: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const settingsRow = await prisma.referralSettings.findFirst()
    const settings = settingsRow
      ? { isEnabled: settingsRow.isEnabled, minWithdrawalUsd: Number(settingsRow.minWithdrawalUsd) }
      : DEFAULT_REFERRAL_SETTINGS

    if (!settings.isEnabled) {
      return NextResponse.json({ error: 'Referral withdrawals are currently disabled.' }, { status: 400 })
    }

    const totalBonusUsd = user.referralBonuses
      .filter(bonus => bonus.status !== 'revoked')
      .reduce((sum, bonus) => sum + Number(bonus.amountUsd), 0)

    const reservedUsd = user.referralWithdrawals
      .filter(item => item.status !== 'rejected')
      .reduce((sum, item) => sum + Number(item.amountUsd), 0)

    const availableUsd = Math.max(0, totalBonusUsd - reservedUsd)

    if (amountUsd < settings.minWithdrawalUsd) {
      return NextResponse.json(
        { error: `Minimum referral withdrawal is $${settings.minWithdrawalUsd.toFixed(2)}.` },
        { status: 400 }
      )
    }

    if (amountUsd > availableUsd) {
      return NextResponse.json({ error: 'Amount exceeds available referral balance.' }, { status: 400 })
    }

    const prices = await getTrackedCryptoPricesUsd()
    const price = prices[coinType]
    if (!price || !Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: 'Unable to fetch coin price.' }, { status: 400 })
    }

    const amountCrypto = convertUsdToCoin(amountUsd, coinType, prices)

    const withdrawal = await prisma.referralWithdrawal.create({
      data: {
        userId: user.id,
        coinType,
        amountUsd,
        amountCrypto,
        walletAddress: 'Account Balance',
        status: 'pending',
      },
    })

    await logUserActivity({
      userId: user.id,
      action: 'ReferralWithdrawalToAccountBalanceRequested',
      detail: `Requested $${amountUsd.toFixed(2)} referral transfer to account balance (${coinType}).`,
    })

    return NextResponse.json({ success: true, withdrawalId: withdrawal.id })
  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Referral withdrawal request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
