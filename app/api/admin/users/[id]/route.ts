import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { logUserActivity } from '@/lib/user-activity'

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

    const body = await req.json()
    const action = body?.action as string

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

      const maxHashrate = latestPlan ? Number(latestPlan.plan.baseHashrate) : null
      const assignedHashrate = Number(body.assignedHashrate)
      const counterSpeed = Number(body.counterSpeed)

      if (!Number.isFinite(assignedHashrate) || assignedHashrate <= 0) {
        return NextResponse.json({ error: 'Assigned hashrate must be greater than 0.' }, { status: 400 })
      }

      if (maxHashrate !== null && assignedHashrate > maxHashrate) {
        return NextResponse.json(
          { error: `Assigned hashrate cannot exceed plan max (${maxHashrate}).` },
          { status: 400 }
        )
      }

      if (!Number.isFinite(counterSpeed) || counterSpeed < 0.0001 || counterSpeed > 0.01) {
        return NextResponse.json(
          { error: 'Counter speed must be between 0.0001 and 0.01.' },
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

      if (body.miningPool && !allowedPools.includes(body.miningPool)) {
        return NextResponse.json({ error: 'Invalid mining pool selection.' }, { status: 400 })
      }

      if (body.dataCenterLocation && !allowedLocations.includes(body.dataCenterLocation)) {
        return NextResponse.json({ error: 'Invalid data center location selection.' }, { status: 400 })
      }

      await prisma.miningStats.update({
        where: { id: activeMining.id },
        data: {
          assignedHashrate,
          counterSpeed,
          miningPool: typeof body.miningPool === 'string' ? body.miningPool : undefined,
          dataCenterLocation: typeof body.dataCenterLocation === 'string' ? body.dataCenterLocation : undefined,
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

      await prisma.miningStats.update({
        where: { id: activeMining.id },
        data: {
          isActive: Boolean(body.isActive),
        },
      })

      await prisma.adminActivityLog.create({
        data: {
          actorAdminId: adminUser.id,
          targetUserId: userId,
          action: 'toggleMining',
          detail: `Mining ${body.isActive ? 'resumed' : 'paused'}.`,
        },
      })

      return NextResponse.json({ success: true })
    }

    if (action === 'updateEarnings') {
      const earningsId = Number(body.earningsId)
      if (Number.isNaN(earningsId)) {
        return NextResponse.json({ error: 'Invalid earnings id' }, { status: 400 })
      }

      const earningsRecord = await prisma.earnings.findFirst({
        where: { id: earningsId, userId },
      })

      if (!earningsRecord) {
        return NextResponse.json({ error: 'Earnings not found' }, { status: 404 })
      }

      await prisma.earnings.update({
        where: { id: earningsRecord.id },
        data: {
          dailyEstimateUsd: body.dailyEstimateUsd,
          dailyEstimateCrypto: body.dailyEstimateCrypto,
          totalEarnedUsd: body.totalEarnedUsd,
          totalEarnedCrypto: body.totalEarnedCrypto,
          isAdminOverride:
            Number(body.dailyEstimateUsd || 0) > 0 ||
            Number(body.dailyEstimateCrypto || 0) > 0 ||
            Number(body.totalEarnedUsd || 0) > 0 ||
            Number(body.totalEarnedCrypto || 0) > 0,
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

      const botSpeed = Number(body.botSpeed)
      if (!Number.isFinite(botSpeed) || botSpeed < 0.5 || botSpeed > 2.5) {
        return NextResponse.json({ error: 'Portfolio cadence must be between 0.5x and 2.5x.' }, { status: 400 })
      }

      const allowedStrategies = ['Portfolio Balance', 'Macro Rotation', 'Yield Capture', 'Risk Parity', 'Momentum Blend']
      const allowedRisk = ['conservative', 'balanced', 'growth', 'aggressive']

      if (body.strategy && !allowedStrategies.includes(body.strategy)) {
        return NextResponse.json({ error: 'Invalid strategy selection.' }, { status: 400 })
      }

      if (body.riskLevel && !allowedRisk.includes(body.riskLevel)) {
        return NextResponse.json({ error: 'Invalid risk level selection.' }, { status: 400 })
      }

      await prisma.tradingStat.update({
        where: { id: activeTrading.id },
        data: {
          botSpeed,
          strategy: body.strategy,
          riskLevel: body.riskLevel,
        },
      })

      await prisma.adminActivityLog.create({
        data: {
          actorAdminId: adminUser.id,
          targetUserId: userId,
          action: 'updateTrading',
          detail: `Portfolio cadence ${botSpeed}x, strategy ${body.strategy}, risk ${body.riskLevel}.`,
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

      await prisma.tradingStat.update({
        where: { id: activeTrading.id },
        data: { isActive: Boolean(body.isActive) },
      })

      await prisma.adminActivityLog.create({
        data: {
          actorAdminId: adminUser.id,
          targetUserId: userId,
          action: 'toggleTrading',
          detail: `Trading ${body.isActive ? 'resumed' : 'paused'}.`,
        },
      })

      return NextResponse.json({ success: true })
    }

    if (action === 'updateTradingEarnings') {
      const earningsId = Number(body.earningsId)
      if (Number.isNaN(earningsId)) {
        return NextResponse.json({ error: 'Invalid earnings id' }, { status: 400 })
      }

      const tradingEarning = await prisma.tradingEarning.findFirst({
        where: { id: earningsId, userId },
      })

      if (!tradingEarning) {
        return NextResponse.json({ error: 'Trading earnings not found' }, { status: 404 })
      }

      await prisma.tradingEarning.update({
        where: { id: tradingEarning.id },
        data: {
          dailyEstimateUsd: body.dailyEstimateUsd,
          totalEarnedUsd: body.totalEarnedUsd,
          isAdminOverride: Number(body.dailyEstimateUsd || 0) > 0 || Number(body.totalEarnedUsd || 0) > 0,
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
      const earningsId = Number(body.earningsId)
      if (Number.isNaN(earningsId)) {
        return NextResponse.json({ error: 'Invalid earnings id' }, { status: 400 })
      }

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
      await prisma.user.update({
        where: { id: userId },
        data: {
          role: body.role ?? undefined,
          accountStatus: body.accountStatus ?? undefined,
        },
      })

      await prisma.adminActivityLog.create({
        data: {
          actorAdminId: adminUser.id,
          targetUserId: userId,
          action: 'updateUser',
          detail: `Role: ${body.role ?? 'unchanged'}, Status: ${body.accountStatus ?? 'unchanged'}.`,
        },
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
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
