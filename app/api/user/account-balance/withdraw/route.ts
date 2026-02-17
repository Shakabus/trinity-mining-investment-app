import { randomUUID } from 'crypto'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  createAccountBalanceEntry,
  getAccountBalanceCoinAvailability,
  getAccountBalanceEntries,
  getAccountBalanceSummary,
  lockUserBalanceForUpdate,
} from '@/lib/account-balance'
import { convertUsdToCoin, getTrackedCryptoPricesUsd } from '@/lib/crypto-prices'
import { logUserActivity } from '@/lib/user-activity'
import {
  isInputValidationError,
  readBooleanField,
  readJsonObject,
  readNumberField,
  readStringField,
} from '@/lib/requestValidation'
import { getLatestSolWalletAddress } from '@/lib/wallet-addresses'

const WITHDRAW_ALLOWED_FIELDS = [
  'amountUsd',
  'coinType',
  'walletAddress',
  'customMethod',
  'customMethodNote',
] as const
const ALLOWED_COINS = ['BTC', 'ETH', 'USDT', 'SOL'] as const
type WithdrawCoin = (typeof ALLOWED_COINS)[number]

class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: {
        id: true,
        btcWalletAddress: true,
        ethWalletAddress: true,
        walletAddress: true,
      },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const [summary, entries] = await Promise.all([
      getAccountBalanceSummary(user.id),
      getAccountBalanceEntries(user.id, { limit: 120 }),
    ])

    return NextResponse.json({
      summary,
      entries: entries
        .filter(entry => entry.source === 'account_balance_withdrawal')
        .map(entry => ({
          ...entry,
          createdAt: entry.createdAt.toISOString(),
        })),
    })
  } catch (error) {
    console.error('Get account withdrawals data error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await readJsonObject(req, { allowedKeys: WITHDRAW_ALLOWED_FIELDS })
    const amountUsd = readNumberField(body, 'amountUsd', {
      required: true,
      min: 10,
      max: 100000000,
    })!
    const coinType = readStringField(body, 'coinType', {
      required: true,
      toUpperCase: true,
      enumValues: ALLOWED_COINS,
    })! as WithdrawCoin
    const customMethod = readBooleanField(body, 'customMethod') ?? false
    const customMethodNote = readStringField(body, 'customMethodNote', {
      maxLength: 240,
    })
    const walletAddress = readStringField(body, 'walletAddress', { maxLength: 180 })

    if (customMethod && !customMethodNote) {
      return NextResponse.json({ error: 'Describe your custom payout method.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: {
        id: true,
        btcWalletAddress: true,
        ethWalletAddress: true,
        walletAddress: true,
      },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const presetWalletByCoin = {
      BTC: user.btcWalletAddress?.trim() || '',
      ETH: user.ethWalletAddress?.trim() || '',
      USDT: user.walletAddress?.trim() || '',
      SOL: (await getLatestSolWalletAddress(user.id)).trim(),
    }
    const presetWallet = presetWalletByCoin[coinType]

    if (!customMethod && !presetWallet) {
      return NextResponse.json(
        { error: `No ${coinType} wallet set in Settings. Add it before withdrawing.` },
        { status: 400 }
      )
    }

    const prices = await getTrackedCryptoPricesUsd()
    const amountCrypto = convertUsdToCoin(amountUsd, coinType, prices)
    const referenceId = `account-withdrawal:${randomUUID()}`

    await prisma.$transaction(async tx => {
      await lockUserBalanceForUpdate(user.id, tx)

      const summary = await getAccountBalanceSummary(user.id, tx)
      if (amountUsd > summary.availableToSpendUsd) {
        throw new HttpError(
          400,
          `Insufficient account balance. Available: $${summary.availableToSpendUsd.toFixed(2)}.`
        )
      }

      const coinAvailability = await getAccountBalanceCoinAvailability(user.id, prices, tx)
      const availableCoinAmount = coinAvailability.byCoin[coinType]?.availableCrypto ?? 0
      if (availableCoinAmount + 0.00000001 < amountCrypto) {
        throw new HttpError(
          400,
          `Insufficient ${coinType} wallet balance. Available: ${availableCoinAmount.toFixed(8)} ${coinType}.`
        )
      }

      await createAccountBalanceEntry(
        {
          userId: user.id,
          direction: 'debit',
          status: 'pending',
          amountUsd,
          source: 'account_balance_withdrawal',
          referenceId,
          note: 'Account withdrawal submitted. Awaiting admin approval.',
          metadata: {
            coinType,
            amountCrypto,
            walletAddress: customMethod ? (walletAddress || null) : presetWallet,
            customMethod,
            customMethodNote: customMethodNote || null,
            usdPriceAtRequest: prices[coinType],
          },
        },
        tx
      )
    })

    await logUserActivity({
      userId: user.id,
      action: 'AccountBalanceWithdrawalRequested',
      detail: `Account withdrawal requested for $${amountUsd.toFixed(2)} to ${coinType}.`,
    })

    return NextResponse.json({
      success: true,
      referenceId,
      message: 'Withdrawal request submitted. Awaiting admin approval.',
    })
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Request account withdrawal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
