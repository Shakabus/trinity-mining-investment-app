import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { logUserActivity } from '@/lib/user-activity'
import { randomUUID } from 'crypto'
import { put } from '@vercel/blob'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const userPlanId = Number(formData.get('userPlanId'))
    const txid = String(formData.get('txid') || '').trim()
    const coinType = String(formData.get('coinType') || '').trim().toUpperCase()
    const file = formData.get('file') as File | null

    if (!userPlanId || Number.isNaN(userPlanId)) {
      return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 })
    }

    const allowedCoins = new Set(['BTC', 'ETH', 'LTC', 'USDT'])
    if (coinType && !allowedCoins.has(coinType)) {
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

    const userPlan = await prisma.userPlan.findFirst({
      where: {
        id: userPlanId,
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

    if (!userPlan) {
      return NextResponse.json({ error: 'Pending plan not found.' }, { status: 404 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const extension = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1] || 'bin'
    const filename = `payment_${user.id}_${userPlan.id}_${randomUUID()}.${extension}`
    const blob = await put(`payment-proofs/${filename}`, buffer, {
      access: 'public',
      contentType: file.type,
    })
    const paymentProofUrl = blob.url
    const walletAddress =
      coinType === 'BTC'
        ? 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0emh'
        : coinType === 'ETH' || coinType === 'USDT'
        ? '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
        : coinType === 'LTC'
        ? 'LdP8Qox1VAhCzLJNqrr74YovaWYyNBUWvL'
        : 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0emh'

    const existingPayment = userPlan.payments[0]

    if (existingPayment) {
      await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          transactionId: txid,
          paymentProofUrl,
          cryptoType: coinType || userPlan.plan.coinType,
          walletAddress,
          amountUsd: userPlan.finalPrice,
          status: 'pending',
        },
      })
    } else {
      await prisma.payment.create({
        data: {
          userId: user.id,
          userPlanId: userPlan.id,
          amountUsd: userPlan.finalPrice,
          cryptoType: coinType || userPlan.plan.coinType,
          walletAddress,
          transactionId: txid,
          paymentProofUrl,
          status: 'pending',
        },
      })
    }

    if (userPlan.status !== 'awaiting_payment') {
      await prisma.userPlan.update({
        where: { id: userPlan.id },
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
      action: 'PaymentProofSubmitted',
      detail: `Submitted payment proof for ${userPlan.plan.name}.`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Submit payment proof error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
