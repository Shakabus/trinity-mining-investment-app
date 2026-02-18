import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { prisma } from '@/lib/db'
import { getMoonPayConfig } from '@/lib/security-env'
import { FUNDING_COINS, SYSTEM_FUNDING_WALLETS, toMoonPayCurrencyCode, type FundingCoin } from '@/lib/system-funding-wallets'
import { isInputValidationError, readJsonObject, readNumberField, readStringField } from '@/lib/requestValidation'

const CHECKOUT_ALLOWED_FIELDS = ['provider', 'amountUsd', 'coinType'] as const
const SUPPORTED_PROVIDERS = ['moonpay'] as const

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
    })!
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

    if (provider !== 'moonpay') {
      return NextResponse.json({ error: 'Provider is not available yet.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true, email: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const moonpay = getMoonPayConfig()
    if (!moonpay.publishableKey) {
      return NextResponse.json(
        { error: 'MoonPay is not configured yet. Contact support.' },
        { status: 503 },
      )
    }

    const redirectBase = new URL(request.url).origin
    const params = new URLSearchParams({
      apiKey: moonpay.publishableKey,
      baseCurrencyCode: 'usd',
      baseCurrencyAmount: amountUsd.toFixed(2),
      currencyCode: toMoonPayCurrencyCode(coinType),
      walletAddress: SYSTEM_FUNDING_WALLETS[coinType],
      externalCustomerId: String(user.id),
      showWalletAddressForm: 'false',
      redirectURL: `${redirectBase}/dashboard/account/fund?cardProvider=moonpay`,
    })

    if (user.email) {
      params.set('email', user.email)
    }

    const unsignedUrl = `${moonpay.baseUrl}?${params.toString()}`
    let checkoutUrl = unsignedUrl

    if (moonpay.secretKey) {
      const signature = createHmac('sha256', moonpay.secretKey).update(unsignedUrl).digest('base64')
      checkoutUrl = `${unsignedUrl}&signature=${encodeURIComponent(signature)}`
    }

    return NextResponse.json({
      provider: 'moonpay',
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

