import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import {
  getAccountFreezeSettings,
  summarizeActiveMetricLocks,
} from '@/lib/account-freeze'

const COINS: Array<'BTC' | 'ETH' | 'USDT' | 'SOL'> = ['BTC', 'ETH', 'USDT', 'SOL']

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

    const freezeQuery = await getAccountFreezeSettings(user.id)
    if (freezeQuery.tableMissing) {
      return NextResponse.json({
        active: false,
        reasons: [],
        note: null,
        signature: 'freeze-controls-unavailable',
        updatedAt: null,
      })
    }

    const { settings } = freezeQuery
    const reasons: string[] = []

    const metricLocks = summarizeActiveMetricLocks(settings)
    for (const label of metricLocks) {
      reasons.push(`${label} are temporarily locked.`)
    }

    if (settings.freezeIncomingAll) {
      reasons.push('All incoming funds are temporarily frozen.')
    }
    if (settings.freezeOutgoingAll) {
      reasons.push('All outgoing funds are temporarily frozen.')
    }
    if (settings.accountIncomingFreezeUsd > 0) {
      reasons.push(
        `Account incoming reserve lock: $${settings.accountIncomingFreezeUsd.toFixed(2)}.`
      )
    }
    if (settings.accountOutgoingFreezeUsd > 0) {
      reasons.push(
        `Account outgoing reserve lock: $${settings.accountOutgoingFreezeUsd.toFixed(2)}.`
      )
    }

    for (const coinType of COINS) {
      const coin = settings.coins[coinType]
      if (!coin) continue
      if (coin.incomingFreezeUsd > 0) {
        reasons.push(
          `${coinType} incoming reserve lock: $${coin.incomingFreezeUsd.toFixed(2)}.`
        )
      }
      if (coin.outgoingFreezeUsd > 0) {
        reasons.push(
          `${coinType} outgoing reserve lock: $${coin.outgoingFreezeUsd.toFixed(2)}.`
        )
      }
    }

    const active = reasons.length > 0
    return NextResponse.json({
      active,
      reasons,
      note: settings.note,
      signature: active ? reasons.join('|') : 'none',
      updatedAt: settings.updatedAt,
    })
  } catch (error) {
    console.error('Fetch user freeze status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

