import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import {
  AccountFreezeError,
  applyOutgoingCoinFreezesToAvailability,
  assertIncomingAllowed,
  assertMetricAllowed,
  assertOutgoingAllowed,
  getAccountFreezeSettings,
  logAccountFreezeTableMissing,
} from '@/lib/account-freeze'
import {
  createAccountBalanceEntry,
  getAccountBalanceCoinAvailability,
  lockUserBalanceForUpdate,
} from '@/lib/account-balance'
import {
  TRACKED_ASSET_COINS,
  convertUsdToCoin,
  getTrackedCryptoPricesUsd,
  type TrackedAssetCoin,
} from '@/lib/crypto-prices'
import { logUserActivity } from '@/lib/user-activity'
import {
  isInputValidationError,
  readJsonObject,
  readNumberField,
  readStringField,
} from '@/lib/requestValidation'

const CONVERT_ALLOWED_FIELDS = ['fromCoin', 'toCoin', 'amountUsd'] as const
const CONVERTIBLE_COINS = ['BTC', 'ETH', 'SOL', 'USDT'] as const

class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await readJsonObject(req, { allowedKeys: CONVERT_ALLOWED_FIELDS })
    const fromCoin = readStringField(body, 'fromCoin', {
      required: true,
      toUpperCase: true,
      enumValues: CONVERTIBLE_COINS,
    })! as TrackedAssetCoin
    const toCoin = readStringField(body, 'toCoin', {
      required: true,
      toUpperCase: true,
      enumValues: CONVERTIBLE_COINS,
    })! as TrackedAssetCoin
    const amountUsd = readNumberField(body, 'amountUsd', {
      required: true,
      min: 1,
      max: 100000000,
    })!

    if (fromCoin === toCoin) {
      return NextResponse.json({ error: 'Select two different currencies.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const prices = await getTrackedCryptoPricesUsd()
    const fromRate = prices[fromCoin]
    const toRate = prices[toCoin]
    if (!fromRate || fromRate <= 0 || !toRate || toRate <= 0) {
      return NextResponse.json({ error: 'Unable to resolve live conversion rates.' }, { status: 400 })
    }

    const fromAmountCrypto = convertUsdToCoin(amountUsd, fromCoin, prices)
    const toAmountCrypto = convertUsdToCoin(amountUsd, toCoin, prices)
    const conversionReference = `wallet-conversion:${Date.now()}:${user.id}`

    await prisma.$transaction(async (tx: any) => {
      await lockUserBalanceForUpdate(user.id, tx)
      const freezeQuery = await getAccountFreezeSettings(user.id, tx)
      if (freezeQuery.tableMissing) {
        logAccountFreezeTableMissing('api/user/account-balance/convert:POST')
      } else {
        assertMetricAllowed({
          settings: freezeQuery.settings,
          metric: 'wallets',
          context: 'wallet conversion',
        })
        assertIncomingAllowed({
          settings: freezeQuery.settings,
          coinType: toCoin,
          context: 'wallet conversion target',
        })
      }

      const rawAvailability = await getAccountBalanceCoinAvailability(user.id, prices, tx)
      const availability = freezeQuery.tableMissing
        ? rawAvailability
        : applyOutgoingCoinFreezesToAvailability(rawAvailability, freezeQuery.settings, prices)

      const totalAvailableUsd = TRACKED_ASSET_COINS.reduce(
        (sum, coinType) => sum + (availability.byCoin[coinType]?.availableUsd ?? 0),
        0
      )
      if (!freezeQuery.tableMissing) {
        assertOutgoingAllowed({
          settings: freezeQuery.settings,
          amountUsd,
          availableUsd: totalAvailableUsd,
          context: 'wallet conversion',
        })
      }

      const availableFromCrypto = availability.byCoin[fromCoin]?.availableCrypto ?? 0
      const availableFromUsd = availability.byCoin[fromCoin]?.availableUsd ?? 0

      if (availableFromUsd + 0.01 < amountUsd) {
        throw new HttpError(
          400,
          `Insufficient ${fromCoin} wallet value. Available: $${availableFromUsd.toFixed(2)}.`
        )
      }

      if (availableFromCrypto + 0.00000001 < fromAmountCrypto) {
        throw new HttpError(
          400,
          `Insufficient ${fromCoin} wallet balance. Available: ${availableFromCrypto.toFixed(8)} ${fromCoin}.`
        )
      }

      await createAccountBalanceEntry(
        {
          userId: user.id,
          direction: 'debit',
          status: 'settled',
          amountUsd,
          source: 'wallet_conversion',
          referenceId: `${conversionReference}:from`,
          note: `Converted ${fromCoin} to ${toCoin}.`,
          metadata: {
            coinType: fromCoin,
            amountCrypto: fromAmountCrypto,
            toCoinType: toCoin,
            toAmountCrypto,
            usdPriceAtSettlement: fromRate,
          },
        },
        tx
      )

      await createAccountBalanceEntry(
        {
          userId: user.id,
          direction: 'credit',
          status: 'settled',
          amountUsd,
          source: 'wallet_conversion',
          referenceId: `${conversionReference}:to`,
          note: `Converted ${fromCoin} to ${toCoin}.`,
          metadata: {
            coinType: toCoin,
            amountCrypto: toAmountCrypto,
            fromCoinType: fromCoin,
            fromAmountCrypto,
            usdPriceAtSettlement: toRate,
          },
        },
        tx
      )
    })

    await logUserActivity({
      userId: user.id,
      action: 'WalletConversionCompleted',
      detail: `Converted $${amountUsd.toFixed(2)} from ${fromCoin} to ${toCoin}.`,
    })

    return NextResponse.json({
      success: true,
      fromCoin,
      toCoin,
      amountUsd,
      fromAmountCrypto,
      toAmountCrypto,
    })
  } catch (error) {
    if (error instanceof AccountFreezeError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Wallet conversion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
