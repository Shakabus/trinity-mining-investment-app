import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  getAccountFreezeSettings,
  upsertAccountFreezeSettings,
} from '@/lib/account-freeze'
import { logUserActivity } from '@/lib/user-activity'
import {
  isInputValidationError,
  readBooleanField,
  readJsonObject,
  readNumberField,
  readStringField,
} from '@/lib/requestValidation'

const FREEZE_CONTROL_FIELDS = [
  'userId',
  'freezeIncomingAll',
  'freezeOutgoingAll',
  'accountIncomingFreezeUsd',
  'accountOutgoingFreezeUsd',
  'btcIncomingFreezeUsd',
  'btcOutgoingFreezeUsd',
  'ethIncomingFreezeUsd',
  'ethOutgoingFreezeUsd',
  'usdtIncomingFreezeUsd',
  'usdtOutgoingFreezeUsd',
  'solIncomingFreezeUsd',
  'solOutgoingFreezeUsd',
  'note',
  'notifyUser',
] as const

async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) return null

  const adminUser = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: { id: true, role: true },
  })

  if (!adminUser || adminUser.role !== 'admin') return null
  return adminUser
}

export async function GET(request: Request) {
  try {
    const adminUser = await requireAdmin()
    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = new URL(request.url)
    const userId = Number(url.searchParams.get('userId'))
    if (!Number.isFinite(userId) || userId <= 0) {
      return NextResponse.json({ error: 'Valid userId is required.' }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found.' }, { status: 404 })
    }

    const freezeQuery = await getAccountFreezeSettings(userId)
    if (freezeQuery.tableMissing) {
      return NextResponse.json(
        {
          error: 'Freeze controls are unavailable until database migration is applied.',
          code: 'FREEZE_TABLE_MISSING',
        },
        { status: 503 }
      )
    }

    return NextResponse.json({ settings: freezeQuery.settings })
  } catch (error) {
    console.error('Fetch account freeze controls error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const adminUser = await requireAdmin()
    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await readJsonObject(request, { allowedKeys: FREEZE_CONTROL_FIELDS })
    const userId = readNumberField(body, 'userId', {
      required: true,
      integer: true,
      min: 1,
    })!
    const freezeIncomingAll = readBooleanField(body, 'freezeIncomingAll') ?? false
    const freezeOutgoingAll = readBooleanField(body, 'freezeOutgoingAll') ?? false
    const accountIncomingFreezeUsd = readNumberField(body, 'accountIncomingFreezeUsd', {
      required: true,
      min: 0,
      max: 100000000,
    })!
    const accountOutgoingFreezeUsd = readNumberField(body, 'accountOutgoingFreezeUsd', {
      required: true,
      min: 0,
      max: 100000000,
    })!
    const btcIncomingFreezeUsd = readNumberField(body, 'btcIncomingFreezeUsd', {
      required: true,
      min: 0,
      max: 100000000,
    })!
    const btcOutgoingFreezeUsd = readNumberField(body, 'btcOutgoingFreezeUsd', {
      required: true,
      min: 0,
      max: 100000000,
    })!
    const ethIncomingFreezeUsd = readNumberField(body, 'ethIncomingFreezeUsd', {
      required: true,
      min: 0,
      max: 100000000,
    })!
    const ethOutgoingFreezeUsd = readNumberField(body, 'ethOutgoingFreezeUsd', {
      required: true,
      min: 0,
      max: 100000000,
    })!
    const usdtIncomingFreezeUsd = readNumberField(body, 'usdtIncomingFreezeUsd', {
      required: true,
      min: 0,
      max: 100000000,
    })!
    const usdtOutgoingFreezeUsd = readNumberField(body, 'usdtOutgoingFreezeUsd', {
      required: true,
      min: 0,
      max: 100000000,
    })!
    const solIncomingFreezeUsd = readNumberField(body, 'solIncomingFreezeUsd', {
      required: true,
      min: 0,
      max: 100000000,
    })!
    const solOutgoingFreezeUsd = readNumberField(body, 'solOutgoingFreezeUsd', {
      required: true,
      min: 0,
      max: 100000000,
    })!
    const note = readStringField(body, 'note', { maxLength: 400 }) || null
    const notifyUser = readBooleanField(body, 'notifyUser') ?? false

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true },
    })
    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found.' }, { status: 404 })
    }

    const upsertResult = await upsertAccountFreezeSettings({
      userId,
      freezeIncomingAll,
      freezeOutgoingAll,
      accountIncomingFreezeUsd,
      accountOutgoingFreezeUsd,
      note,
      updatedByAdminId: adminUser.id,
      coins: {
        BTC: { incomingFreezeUsd: btcIncomingFreezeUsd, outgoingFreezeUsd: btcOutgoingFreezeUsd },
        ETH: { incomingFreezeUsd: ethIncomingFreezeUsd, outgoingFreezeUsd: ethOutgoingFreezeUsd },
        USDT: { incomingFreezeUsd: usdtIncomingFreezeUsd, outgoingFreezeUsd: usdtOutgoingFreezeUsd },
        SOL: { incomingFreezeUsd: solIncomingFreezeUsd, outgoingFreezeUsd: solOutgoingFreezeUsd },
      },
    })

    if (upsertResult.tableMissing) {
      return NextResponse.json(
        {
          error: 'Freeze controls are unavailable until database migration is applied.',
          code: 'FREEZE_TABLE_MISSING',
        },
        { status: 503 }
      )
    }

    const summary = [
      freezeIncomingAll ? 'incoming=all' : `incoming(account $${accountIncomingFreezeUsd.toFixed(2)})`,
      freezeOutgoingAll ? 'outgoing=all' : `outgoing(account $${accountOutgoingFreezeUsd.toFixed(2)})`,
      `BTC in/out $${btcIncomingFreezeUsd.toFixed(2)}/$${btcOutgoingFreezeUsd.toFixed(2)}`,
      `ETH in/out $${ethIncomingFreezeUsd.toFixed(2)}/$${ethOutgoingFreezeUsd.toFixed(2)}`,
      `USDT in/out $${usdtIncomingFreezeUsd.toFixed(2)}/$${usdtOutgoingFreezeUsd.toFixed(2)}`,
      `SOL in/out $${solIncomingFreezeUsd.toFixed(2)}/$${solOutgoingFreezeUsd.toFixed(2)}`,
    ].join(', ')

    await prisma.adminActivityLog.create({
      data: {
        actorAdminId: adminUser.id,
        targetUserId: userId,
        action: 'accountFreezeControlsUpdated',
        detail: `Updated account freeze controls: ${summary}.`,
      },
    })

    if (notifyUser) {
      await logUserActivity({
        userId,
        action: 'AccountFreezeControlsUpdated',
        detail: 'Account movement controls were updated.',
      })
    }

    return NextResponse.json({
      success: true,
      settings: upsertResult.settings,
    })
  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Update account freeze controls error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
