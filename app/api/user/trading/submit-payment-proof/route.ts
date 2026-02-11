import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { logUserActivity } from '@/lib/user-activity'
import { randomUUID } from 'crypto'
import { put } from '@vercel/blob'
import {
  isInputValidationError,
  readFormDataStrict,
  readFormFile,
  readFormNumber,
  readFormString,
} from '@/lib/requestValidation'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
const WALLET_MAP: Record<string, string> = {
  BTC: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0emh',
  ETH: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  LTC: 'LdP8Qox1VAhCzLJNqrr74YovaWYyNBUWvL',
  USDT: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
}
const TRADING_PAYMENT_PROOF_FIELDS = ['tradingUserPlanId', 'txid', 'coinType', 'file'] as const

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await readFormDataStrict(req, { allowedKeys: TRADING_PAYMENT_PROOF_FIELDS })
    const tradingUserPlanId = readFormNumber(formData, 'tradingUserPlanId', {
      required: true,
      integer: true,
      min: 1,
    })!
    const txid = readFormString(formData, 'txid', { required: true, maxLength: 80 })!
    const coinType = readFormString(formData, 'coinType', {
      required: true,
      toUpperCase: true,
      enumValues: ['BTC', 'ETH', 'LTC', 'USDT'],
    })!
    const file = readFormFile(formData, 'file', {
      required: true,
      maxBytes: MAX_FILE_SIZE,
      allowedTypes: [...ALLOWED_TYPES],
    })!

    const isHex64 = /^[a-fA-F0-9]{64}$/.test(txid)
    const isEthTx = /^0x[a-fA-F0-9]{64}$/.test(txid)
    if ((coinType === 'ETH' || coinType === 'USDT') && !isEthTx) {
      return NextResponse.json({ error: 'TXID format looks invalid for ETH/USDT.' }, { status: 400 })
    }
    if ((coinType === 'BTC' || coinType === 'LTC') && !isHex64) {
      return NextResponse.json({ error: 'TXID format looks invalid for BTC/LTC.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const tradingPlan = await prisma.tradingUserPlan.findFirst({
      where: {
        id: tradingUserPlanId,
        userId: user.id,
        status: { in: ['selected', 'awaiting_payment'] },
        paymentStatus: 'pending',
      },
      include: {
        plan: true,
        payments: {
          where: { status: 'pending' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!tradingPlan) {
      return NextResponse.json({ error: 'Pending trading plan not found.' }, { status: 404 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const extension = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1] || 'bin'
    const filename = `trading_payment_${user.id}_${tradingPlan.id}_${randomUUID()}.${extension}`
    const blob = await put(`payment-proofs/${filename}`, buffer, {
      access: 'public',
      contentType: file.type,
    })
    const paymentProofUrl = blob.url
    const walletAddress = WALLET_MAP[coinType] || WALLET_MAP.USDT

    const existingPayment = tradingPlan.payments[0]

    if (existingPayment) {
      await prisma.tradingPayment.update({
        where: { id: existingPayment.id },
        data: {
          transactionId: txid,
          paymentProofUrl,
          cryptoType: coinType,
          walletAddress,
          amountUsd: tradingPlan.investmentUsd,
          status: 'pending',
        },
      })
    } else {
      await prisma.tradingPayment.create({
        data: {
          userId: user.id,
          tradingUserPlanId: tradingPlan.id,
          amountUsd: tradingPlan.investmentUsd,
          cryptoType: coinType,
          walletAddress,
          transactionId: txid,
          paymentProofUrl,
          status: 'pending',
        },
      })
    }

    if (tradingPlan.status !== 'awaiting_payment') {
      await prisma.tradingUserPlan.update({
        where: { id: tradingPlan.id },
        data: {
          status: 'awaiting_payment',
          paymentStatus: 'pending',
        },
      })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { accountStatus: 'pending' },
    })

    await logUserActivity({
      userId: user.id,
      action: 'TradingPaymentProofSubmitted',
      detail: `Submitted payment proof for ${tradingPlan.plan.name}.`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Trading payment proof error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
