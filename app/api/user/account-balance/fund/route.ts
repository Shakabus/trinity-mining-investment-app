import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { put } from '@vercel/blob'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/db'
import {
  createAccountBalanceEntry,
  getAccountBalanceEntries,
  getAccountBalanceSummary,
} from '@/lib/account-balance'
import { logUserActivity } from '@/lib/user-activity'
import {
  isInputValidationError,
  readFormDataStrict,
  readFormFile,
  readFormNumber,
  readFormString,
} from '@/lib/requestValidation'

export const runtime = 'nodejs'

const FUND_ACCOUNT_ALLOWED_FIELDS = ['amountUsd', 'coinType', 'txid', 'file'] as const
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
const ALLOWED_COINS = ['BTC', 'ETH', 'USDT', 'SOL'] as const

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const summary = await getAccountBalanceSummary(user.id)
    const entries = await getAccountBalanceEntries(user.id, { limit: 80 })

    return NextResponse.json({
      summary,
      entries: entries.map(entry => ({
        ...entry,
        createdAt: entry.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Get fund account data error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await readFormDataStrict(req, {
      allowedKeys: FUND_ACCOUNT_ALLOWED_FIELDS,
    })
    const amountUsd = readFormNumber(formData, 'amountUsd', {
      required: true,
      min: 10,
      max: 100000000,
    })!
    const coinType = readFormString(formData, 'coinType', {
      required: true,
      toUpperCase: true,
      enumValues: ALLOWED_COINS,
    })!
    const txid = readFormString(formData, 'txid', { required: true, maxLength: 120 })!
    const file = readFormFile(formData, 'file', {
      required: true,
      maxBytes: MAX_FILE_SIZE,
      allowedTypes: [...ALLOWED_TYPES],
    })!

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const normalizedTxid = txid.trim()
    const isHex64 = /^[a-fA-F0-9]{64}$/.test(normalizedTxid)
    const isEthTx = /^0x[a-fA-F0-9]{64}$/.test(normalizedTxid)
    const isSolTx = normalizedTxid.length >= 32
    if ((coinType === 'ETH' || coinType === 'USDT') && !isEthTx) {
      return NextResponse.json({ error: 'TXID format is invalid for ETH/USDT.' }, { status: 400 })
    }
    if (coinType === 'BTC' && !isHex64) {
      return NextResponse.json({ error: 'TXID format is invalid for BTC.' }, { status: 400 })
    }
    if (coinType === 'SOL' && !isSolTx) {
      return NextResponse.json({ error: 'TXID format is invalid for SOL.' }, { status: 400 })
    }

    const extension = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1] || 'bin'
    const filename = `account_funding_${user.id}_${randomUUID()}.${extension}`
    const blob = await put(`account-funding-proofs/${filename}`, Buffer.from(await file.arrayBuffer()), {
      access: 'public',
      contentType: file.type,
    })

    const requestId = `fund-${randomUUID()}`
    await createAccountBalanceEntry({
      userId: user.id,
      direction: 'credit',
      status: 'pending',
      amountUsd,
      source: 'funding_deposit',
      referenceId: requestId,
      note: 'Funding request submitted. Awaiting admin approval.',
      metadata: {
        coinType,
        txid: normalizedTxid,
        proofUrl: blob.url,
      },
    })

    await logUserActivity({
      userId: user.id,
      action: 'AccountFundingSubmitted',
      detail: `Funding request submitted for $${amountUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
    })

    return NextResponse.json({
      success: true,
      requestId,
      message: 'Funding request submitted and is pending approval.',
    })
  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Fund account request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
