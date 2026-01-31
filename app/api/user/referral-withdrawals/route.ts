import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { getCryptoPricesUsd } from '@/lib/earnings'
import { logUserActivity } from '@/lib/user-activity'

const DEFAULT_REFERRAL_SETTINGS = {
  isEnabled: true,
  minWithdrawalUsd: 50,
}

const SUPPORTED_COINS = ['BTC', 'ETH', 'LTC'] as const

export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const coinType = body?.coinType as (typeof SUPPORTED_COINS)[number]
    const amountUsd = Number(body?.amountUsd)

    if (!SUPPORTED_COINS.includes(coinType)) {
      return NextResponse.json({ error: 'Unsupported coin.' }, { status: 400 })
    }

    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      return NextResponse.json({ error: 'Invalid withdrawal amount.' }, { status: 400 })
    }

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

    const walletAddress =
      coinType === 'BTC'
        ? user.btcWalletAddress || user.walletAddress
        : coinType === 'ETH'
        ? user.ethWalletAddress
        : user.ltcWalletAddress

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address not found.' }, { status: 400 })
    }

    const prices = await getCryptoPricesUsd()
    const price = prices[coinType] || 0
    if (!price) {
      return NextResponse.json({ error: 'Unable to fetch coin price.' }, { status: 400 })
    }

    const amountCrypto = amountUsd / price

    const withdrawal = await prisma.referralWithdrawal.create({
      data: {
        userId: user.id,
        coinType,
        amountUsd,
        amountCrypto,
        walletAddress,
        status: 'pending',
      },
    })

    await logUserActivity({
      userId: user.id,
      action: 'ReferralWithdrawalRequested',
      detail: `Requested $${amountUsd.toFixed(2)} referral withdrawal in ${coinType}.`,
    })

    return NextResponse.json({ success: true, withdrawalId: withdrawal.id })
  } catch (error) {
    console.error('Referral withdrawal request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
