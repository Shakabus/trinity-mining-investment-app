import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/db'
import { createAccountBalanceEntry } from '@/lib/account-balance'
import { FUNDING_COINS, SYSTEM_FUNDING_WALLETS, type FundingCoin } from '@/lib/system-funding-wallets'
import { isInputValidationError, readJsonObject, readNumberField, readStringField } from '@/lib/requestValidation'
import { logUserActivity } from '@/lib/user-activity'
import {
  sendAccountFundingSubmittedEmail,
  sendSupportInboxAlertEmail,
} from '@/lib/transactional-email'

const CHECKOUT_ALLOWED_FIELDS = ['provider', 'amountUsd', 'coinType'] as const
const SUPPORTED_PROVIDERS = ['transak', 'ramp', 'moonpay', 'mercuryo'] as const

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CardProvider = (typeof SUPPORTED_PROVIDERS)[number]

const PROVIDER_CONFIG: Record<CardProvider, { label: string; checkoutUrl: string }> = {
  transak: {
    label: 'Transak',
    checkoutUrl: 'https://transak.com/buy',
  },
  ramp: {
    label: 'Ramp Network',
    checkoutUrl: 'https://rampnetwork.com/buy-crypto',
  },
  moonpay: {
    label: 'MoonPay',
    checkoutUrl: 'https://www.moonpay.com/buy',
  },
  mercuryo: {
    label: 'Mercuryo',
    checkoutUrl: 'https://exchange.mercuryo.io/',
  },
}

function isValidCheckoutUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return false
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false
    if (!parsed.hostname) return false
    if (parsed.href.toLowerCase() === 'about:blank') return false
    return true
  } catch {
    return false
  }
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
      select: { id: true, email: true, fullName: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const walletAddress = SYSTEM_FUNDING_WALLETS[coinType]
    const amountLabel = Number(amountUsd.toFixed(2))

    const providerConfig = PROVIDER_CONFIG[provider]
    const checkoutUrl = providerConfig.checkoutUrl

    if (!isValidCheckoutUrl(checkoutUrl)) {
      return NextResponse.json(
        {
          error: `${provider} checkout is not configured correctly. Contact support.`,
        },
        { status: 503 },
      )
    }

    const requestId = `fund-card-${randomUUID()}`
    const providerLabel = providerConfig.label

    await createAccountBalanceEntry({
      userId: user.id,
      direction: 'credit',
      status: 'pending',
      amountUsd: amountLabel,
      source: 'funding_deposit',
      referenceId: requestId,
      note: `${providerLabel} card checkout initiated. Awaiting system review.`,
      metadata: {
        coinType,
        walletAddress,
        cardProvider: provider,
        paymentChannel: 'card_provider',
        checkoutUrl,
        initiatedAt: new Date().toISOString(),
      },
    })

    await logUserActivity({
      userId: user.id,
      action: 'AccountFundingSubmitted',
      detail: `Card funding initiated via ${providerLabel} for $${amountLabel.toFixed(2)}.`,
    })

    if (user.email) {
      await sendAccountFundingSubmittedEmail({
        to: user.email,
        fullName: user.fullName,
        amountUsd: amountLabel,
        coinType,
        referenceId: requestId,
      })
    }

    await sendSupportInboxAlertEmail({
      subject: `Card Funding Initiated ${requestId}`,
      body: [
        `Reference: ${requestId}`,
        `User ID: ${user.id}`,
        `User Email: ${user.email || 'no-email'}`,
        `Amount (USD): ${amountLabel.toFixed(2)}`,
        `Coin: ${coinType}`,
        `Provider: ${providerLabel}`,
        `Checkout URL: ${checkoutUrl}`,
      ].join('\n'),
    })

    return NextResponse.json({
      provider,
      checkoutUrl,
      requestId,
    })
  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('Create card checkout URL error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
