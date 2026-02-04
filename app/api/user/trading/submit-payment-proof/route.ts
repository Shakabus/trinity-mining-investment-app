import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { logUserActivity } from '@/lib/user-activity'
import { randomUUID } from 'crypto'
import { put } from '@vercel/blob'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
const WALLET_MAP: Record<string, string> = {
  BTC: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0emh',
  ETH: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  LTC: 'LdP8Qox1VAhCzLJNqrr74YovaWYyNBUWvL',
  USDT: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const tradingUserPlanId = Number(formData.get('tradingUserPlanId'))
    const txid = String(formData.get('txid') || '').trim()
    const coinType = String(formData.get('coinType') || '').trim().toUpperCase()
    const file = formData.get('file') as File | null

    if (!tradingUserPlanId || Number.isNaN(tradingUserPlanId)) {
      return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 })
    }

    const allowedCoins = new Set(['BTC', 'ETH', 'LTC', 'USDT'])
    if (!allowedCoins.has(coinType)) {
      return NextResponse.json({ error: 'Unsupported coin type.' }, { status: 400 })
    }

    if (!txid) {
      return NextResponse.json({ error: 'Transaction ID is required.' }, { status: 400 })
    }

    const isHex64 = /^[a-fA-F0-9]{64}$/.test(txid)
    const isEthTx = /^0x[a-fA-F0-9]{64}$/.test(txid)
    if ((coinType === 'ETH' || coinType === 'USDT') && !isEthTx) {
      return NextResponse.json({ error: 'TXID format looks invalid for ETH/USDT.' }, { status: 400 })
    }
    if ((coinType === 'BTC' || coinType === 'LTC') && !isHex64) {
      return NextResponse.json({ error: 'TXID format looks invalid for BTC/LTC.' }, { status: 400 })
    }

    if (!file) {
      return NextResponse.json({ error: 'Payment proof file is required.' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type.' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size must be under 5MB.' }, { status: 400 })
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
    console.error('Trading payment proof error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
