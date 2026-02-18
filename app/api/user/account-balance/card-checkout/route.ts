import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { prisma } from '@/lib/db'
import { getBanxaConfig, getMoonPayConfig, getTransakConfig } from '@/lib/security-env'
import { FUNDING_COINS, SYSTEM_FUNDING_WALLETS, toMoonPayCurrencyCode, type FundingCoin } from '@/lib/system-funding-wallets'
import { isInputValidationError, readJsonObject, readNumberField, readStringField } from '@/lib/requestValidation'

const CHECKOUT_ALLOWED_FIELDS = ['provider', 'amountUsd', 'coinType'] as const
const SUPPORTED_PROVIDERS = ['moonpay', 'transak', 'banxa'] as const

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CardProvider = (typeof SUPPORTED_PROVIDERS)[number]

function toTransakCurrencyCode(coinType: FundingCoin) {
  if (coinType === 'USDT') return 'USDT'
  return coinType
}

function applyBanxaTemplate(template: string, values: Record<string, string>) {
  let output = template
  for (const [key, value] of Object.entries(values)) {
    output = output.replaceAll(`{${key}}`, encodeURIComponent(value))
  }
  return output
}

export async function POST(request: Request) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await readJsonObject(request, { allowedKeys: CHECKOUT_ALLOWED_FIELDS })
    const provider = readStringField(body, 'provider', {
      required: true,
      toLowerCase: true,
      enumValues: SUPPORTED_PROVIDERS,
    })! as CardProvider
    const amountUsd = readNumberField(body, 'amountUsd', {
      required: true,
      min: 20,
      max: 100000,
    })!
    const coinType = readStringField(body, 'coinType', {
      required: true,
      toUpperCase: true,
      enumValues: FUNDING_COINS,
    })! as FundingCoin

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true, email: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const redirectBase = new URL(request.url).origin
    const redirectUrl = `${redirectBase}/dashboard/account/fund?cardProvider=${provider}`
    const walletAddress = SYSTEM_FUNDING_WALLETS[coinType]
    const amountLabel = amountUsd.toFixed(2)

    let checkoutUrl = ''

    if (provider === 'moonpay') {
      const moonpay = getMoonPayConfig()
      if (!moonpay.publishableKey) {
        return NextResponse.json(
          { error: 'MoonPay is not configured yet. Contact support.' },
          { status: 503 },
        )
      }

      const params = new URLSearchParams({
        apiKey: moonpay.publishableKey,
        baseCurrencyCode: 'usd',
        baseCurrencyAmount: amountLabel,
        currencyCode: toMoonPayCurrencyCode(coinType),
        walletAddress,
        externalCustomerId: String(user.id),
        showWalletAddressForm: 'false',
        redirectURL: redirectUrl,
      })

      if (user.email) {
        params.set('email', user.email)
      }

      const unsignedUrl = `${moonpay.baseUrl}?${params.toString()}`
      checkoutUrl = unsignedUrl

      if (moonpay.secretKey) {
        const signature = createHmac('sha256', moonpay.secretKey).update(unsignedUrl).digest('base64')
        checkoutUrl = `${unsignedUrl}&signature=${encodeURIComponent(signature)}`
      }
    } else if (provider === 'transak') {
      const transak = getTransakConfig()
      if (!transak.apiKey) {
        return NextResponse.json(
          { error: 'Transak is not configured yet. Contact support.' },
          { status: 503 },
        )
      }

      const params = new URLSearchParams({
        apiKey: transak.apiKey,
        fiatCurrency: 'USD',
        fiatAmount: amountLabel,
        cryptoCurrencyCode: toTransakCurrencyCode(coinType),
        walletAddress,
        disableWalletAddressForm: 'true',
        redirectURL: redirectUrl,
      })

      if (user.email) {
        params.set('email', user.email)
      }

      checkoutUrl = `${transak.baseUrl}?${params.toString()}`
    } else {
      const banxa = getBanxaConfig()
      if (!banxa.checkoutTemplate) {
        return NextResponse.json(
          { error: 'Banxa is not configured yet. Contact support.' },
          { status: 503 },
        )
      }

      checkoutUrl = applyBanxaTemplate(banxa.checkoutTemplate, {
        amountUsd: amountLabel,
        coinType,
        walletAddress,
        userId: String(user.id),
        email: user.email || '',
        redirectUrl,
      })
    }

    return NextResponse.json({
      provider,
      checkoutUrl,
    })
  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('Create card checkout URL error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
