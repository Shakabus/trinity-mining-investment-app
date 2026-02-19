import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { logUserActivity } from '@/lib/user-activity'
import {
  InputValidationError,
  readBooleanField,
  isInputValidationError,
  readJsonObject,
  readNumberField,
  readStringField,
} from '@/lib/requestValidation'
import { scalePlanHashrate } from '@/lib/mining-hashrate'

const USER_ACTIONS = [
  'updateMining',
  'toggleMining',
  'updateEarnings',
  'updateTrading',
  'toggleTrading',
  'updateTradingEarnings',
  'unlockHistorical',
  'updateUser',
] as const

const USER_ACTION_ALLOWED_FIELDS: Record<(typeof USER_ACTIONS)[number], readonly string[]> = {
  updateMining: ['action', 'assignedHashrate', 'counterSpeed', 'miningPool', 'dataCenterLocation'],
  toggleMining: ['action', 'isActive'],
  updateEarnings: ['action', 'earningsId', 'dailyEstimateUsd', 'dailyEstimateCrypto', 'totalEarnedUsd', 'totalEarnedCrypto'],
  updateTrading: ['action', 'botSpeed', 'strategy', 'riskLevel'],
  toggleTrading: ['action', 'isActive'],
  updateTradingEarnings: ['action', 'earningsId', 'dailyEstimateUsd', 'totalEarnedUsd'],
  unlockHistorical: ['action', 'earningsId'],
  updateUser: ['action', 'role', 'accountStatus'],
}

async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) return null
  const adminUser = await prisma.user.findUnique({ where: { clerkUserId: userId } })
  if (!adminUser || adminUser.role !== 'admin') return null
  return adminUser
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminUser = await requireAdmin()
    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const userId = Number(id)
    if (Number.isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 })
    }

    const body = await readJsonObject(req)
    const action = readStringField(body, 'action', {
      required: true,
      enumValues: USER_ACTIONS,
    }) as (typeof USER_ACTIONS)[number]

    const allowed = USER_ACTION_ALLOWED_FIELDS[action]
    for (const key of Object.keys(body)) {
      if (!allowed.includes(key)) {
        throw new InputValidationError(`Unexpected field: ${key}`)
      }
    }

    if (action === 'updateMining') {
      const activeMining = await prisma.miningStats.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      })

      if (!activeMining) {
        return NextResponse.json({ error: 'Mining stats not found' }, { status: 404 })
      }

      const latestPlan = await prisma.userPlan.findFirst({
        where: { userId },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      })

      const maxHashrate = latestPlan ? scalePlanHashrate(Number(latestPlan.plan.baseHashrate)) : null
      const assignedHashrate = readNumberField(body, 'assignedHashrate', { required: true, min: 0.0001 })!
      const counterSpeed = readNumberField(body, 'counterSpeed', { required: true, min: 0.0001, max: 0.01 })!
      const miningPool = readStringField(body, 'miningPool', { maxLength: 50 })
      const dataCenterLocation = readStringField(body, 'dataCenterLocation', { maxLength: 100 })

      if (maxHashrate !== null && assignedHashrate > maxHashrate) {
        return NextResponse.json(
          { error: `Assigned hashrate cannot exceed plan max (${maxHashrate}).` },
          { status: 400 }
        )
      }

      const allowedPools = ['AntPool', 'Foundry USA', 'ViaBTC', 'F2Pool', 'Luxor']
      const allowedLocations = [
        'Canada (Hydro)',
        'Texas, USA (Wind)',
        'Norway (Renewable)',
        'Iceland (Geothermal)',
        'Germany (Grid)',
      ]

      if (miningPool && !allowedPools.includes(miningPool)) {
        return NextResponse.json({ error: 'Invalid mining pool selection.' }, { status: 400 })
      }

      if (dataCenterLocation && !allowedLocations.includes(dataCenterLocation)) {
        return NextResponse.json({ error: 'Invalid data center location selection.' }, { status: 400 })
      }

      await prisma.miningStats.update({
        where: { id: activeMining.id },
        data: {
          assignedHashrate,
          counterSpeed,
          miningPool: miningPool || undefined,
          dataCenterLocation: dataCenterLocation || undefined,
        },
      })

      await prisma.adminActivityLog.create({
        data: {
          actorAdminId: adminUser.id,
          targetUserId: userId,
          action: 'updateMining',
          detail: `Assigned hashrate set to ${assignedHashrate}, counter speed set to ${counterSpeed}.`,
        },
      })

      return NextResponse.json({ success: true })
    }

    if (action === 'toggleMining') {
      const activeMining = await prisma.miningStats.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      })

      if (!activeMining) {
        return NextResponse.json({ error: 'Mining stats not found' }, { status: 404 })
      }

      const isActive = readBooleanField(body, 'isActive', { required: true })!

      await prisma.miningStats.update({
        where: { id: activeMining.id },
        data: {
          isActive,
        },
      })

      await prisma.adminActivityLog.create({
        data: {
          actorAdminId: adminUser.id,
          targetUserId: userId,
          action: 'toggleMining',
          detail: `Mining ${isActive ? 'resumed' : 'paused'}.`,
        },
      })

      return NextResponse.json({ success: true })
    }

    if (action === 'updateEarnings') {
      const earningsId = readNumberField(body, 'earningsId', { required: true, integer: true, min: 1 })!
      const dailyEstimateUsd = readNumberField(body, 'dailyEstimateUsd', { required: true, min: 0 })!
      const dailyEstimateCrypto = readNumberField(body, 'dailyEstimateCrypto', { required: true, min: 0 })!
      const totalEarnedUsd = readNumberField(body, 'totalEarnedUsd', { required: true, min: 0 })!
      const totalEarnedCrypto = readNumberField(body, 'totalEarnedCrypto', { required: true, min: 0 })!

      const earningsRecord = await prisma.earnings.findFirst({
        where: { id: earningsId, userId },
      })

      if (!earningsRecord) {
        return NextResponse.json({ error: 'Earnings not found' }, { status: 404 })
      }

      await prisma.earnings.update({
        where: { id: earningsRecord.id },
        data: {
          dailyEstimateUsd,
          dailyEstimateCrypto,
          totalEarnedUsd,
          totalEarnedCrypto,
          isAdminOverride:
            dailyEstimateUsd > 0 ||
            dailyEstimateCrypto > 0 ||
            totalEarnedUsd > 0 ||
            totalEarnedCrypto > 0,
          lastEstimateUpdateAt: null,
          lastUsdUpdateAt: null,
        },
      })

      await prisma.adminActivityLog.create({
        data: {
          actorAdminId: adminUser.id,
          targetUserId: userId,
          action: 'updateEarnings',
          detail: `Earnings updated for ${earningsRecord.coinType}.`,
        },
      })

      return NextResponse.json({ success: true })
    }

    if (action === 'updateTrading') {
      const activeTrading = await prisma.tradingStat.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      })

      if (!activeTrading) {
        return NextResponse.json({ error: 'Trading stats not found' }, { status: 404 })
      }

      const botSpeed = readNumberField(body, 'botSpeed', { required: true, min: 0.5, max: 2.5 })!
      const strategy = readStringField(body, 'strategy', { required: true, maxLength: 60 })!
      const riskLevel = readStringField(body, 'riskLevel', { required: true, maxLength: 30 })!

      const allowedStrategies = ['Portfolio Balance', 'Macro Rotation', 'Yield Capture', 'Risk Parity', 'Momentum Blend']
      const allowedRisk = ['conservative', 'balanced', 'growth', 'aggressive']

      if (!allowedStrategies.includes(strategy)) {
        return NextResponse.json({ error: 'Invalid strategy selection.' }, { status: 400 })
      }

      if (!allowedRisk.includes(riskLevel)) {
        return NextResponse.json({ error: 'Invalid risk level selection.' }, { status: 400 })
      }

      await prisma.tradingStat.update({
        where: { id: activeTrading.id },
        data: {
          botSpeed,
          strategy,
          riskLevel,
        },
      })

      await prisma.adminActivityLog.create({
        data: {
          actorAdminId: adminUser.id,
          targetUserId: userId,
          action: 'updateTrading',
          detail: `Portfolio cadence ${botSpeed}x, strategy ${strategy}, risk ${riskLevel}.`,
        },
      })

      return NextResponse.json({ success: true })
    }

    if (action === 'toggleTrading') {
      const activeTrading = await prisma.tradingStat.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      })

      if (!activeTrading) {
        return NextResponse.json({ error: 'Trading stats not found' }, { status: 404 })
      }

      const isActive = readBooleanField(body, 'isActive', { required: true })!

      await prisma.tradingStat.update({
        where: { id: activeTrading.id },
        data: { isActive },
      })

      await prisma.adminActivityLog.create({
        data: {
          actorAdminId: adminUser.id,
          targetUserId: userId,
          action: 'toggleTrading',
          detail: `Trading ${isActive ? 'resumed' : 'paused'}.`,
        },
      })

      return NextResponse.json({ success: true })
    }

    if (action === 'updateTradingEarnings') {
      const earningsId = readNumberField(body, 'earningsId', { required: true, integer: true, min: 1 })!
      const dailyEstimateUsd = readNumberField(body, 'dailyEstimateUsd', { required: true, min: 0 })!
      const totalEarnedUsd = readNumberField(body, 'totalEarnedUsd', { required: true, min: 0 })!

      const tradingEarning = await prisma.tradingEarning.findFirst({
        where: { id: earningsId, userId },
      })

      if (!tradingEarning) {
        return NextResponse.json({ error: 'Trading earnings not found' }, { status: 404 })
      }

      await prisma.tradingEarning.update({
        where: { id: tradingEarning.id },
        data: {
          dailyEstimateUsd,
          totalEarnedUsd,
          isAdminOverride: dailyEstimateUsd > 0 || totalEarnedUsd > 0,
          lastCalculatedAt: null,
        },
      })

      await prisma.adminActivityLog.create({
        data: {
          actorAdminId: adminUser.id,
          targetUserId: userId,
          action: 'updateTradingEarnings',
          detail: 'Trading earnings updated.',
        },
      })

      return NextResponse.json({ success: true })
    }

    if (action === 'unlockHistorical') {
      const earningsId = readNumberField(body, 'earningsId', { required: true, integer: true, min: 1 })!

      const earningsRecord = await prisma.earnings.findFirst({
        where: { id: earningsId, userId },
      })

      if (!earningsRecord) {
        return NextResponse.json({ error: 'Earnings not found' }, { status: 404 })
      }

      await prisma.earnings.update({
        where: { id: earningsRecord.id },
        data: {
          isWithdrawable: true,
        },
      })

      await prisma.adminActivityLog.create({
        data: {
          actorAdminId: adminUser.id,
          targetUserId: userId,
          action: 'unlockHistorical',
          detail: `Historical earnings unlocked for ${earningsRecord.coinType}.`,
        },
      })

      await logUserActivity({
        userId,
        action: 'HistoricalEarningsUnlocked',
        detail: `Historical earnings unlocked for ${earningsRecord.coinType}.`,
      })

      return NextResponse.json({ success: true })
    }

    if (action === 'updateUser') {
      const role = readStringField(body, 'role', { enumValues: ['user', 'admin'] })
      const accountStatus = readStringField(body, 'accountStatus', {
        enumValues: ['inactive', 'pending', 'active', 'suspended'],
      })

      if (!role && !accountStatus) {
        return NextResponse.json(
          { error: 'Provide role or account status to update.' },
          { status: 400 }
        )
      }

      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, accountStatus: true },
      })

      if (!existingUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          role: role ?? undefined,
          accountStatus: accountStatus ?? undefined,
        },
      })

      const nextRole = role ?? existingUser.role
      const nextStatus = accountStatus ?? existingUser.accountStatus

      await prisma.adminActivityLog.create({
        data: {
          actorAdminId: adminUser.id,
          targetUserId: userId,
          action: 'updateUser',
          detail: `Role: ${nextRole}, Status: ${nextStatus}.`,
        },
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Admin user update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminUser = await requireAdmin()
    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const userId = Number(id)
    if (Number.isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 })
    }

    await prisma.adminActivityLog.create({
      data: {
        actorAdminId: adminUser.id,
        targetUserId: userId,
        action: 'deleteUser',
        detail: 'User deleted.',
      },
    })

    await prisma.user.delete({ where: { id: userId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin user delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
