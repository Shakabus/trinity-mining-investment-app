import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCronSecrets, matchesAnySecret } from '@/lib/security-env'

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
    const cronSecrets = getCronSecrets()

    if (!token || cronSecrets.length === 0 || !matchesAnySecret(token, cronSecrets)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()

    const expiringPlans = await prisma.userPlan.findMany({
      where: {
        status: 'active',
        endDate: { lte: now },
      },
      select: {
        id: true,
        userId: true,
      },
    })

    if (expiringPlans.length === 0) {
      return NextResponse.json({ success: true, expired: 0 })
    }

    const expiredPlanIds = expiringPlans.map(plan => plan.id)
    const affectedUserIds = Array.from(new Set(expiringPlans.map(plan => plan.userId)))

    await prisma.$transaction([
      prisma.userPlan.updateMany({
        where: { id: { in: expiredPlanIds } },
        data: { status: 'expired' },
      }),
      prisma.miningStats.updateMany({
        where: { userPlanId: { in: expiredPlanIds } },
        data: { isActive: false },
      }),
      prisma.earnings.updateMany({
        where: { userPlanId: { in: expiredPlanIds } },
        data: { isActive: false },
      }),
    ])

    for (const userId of affectedUserIds) {
      const activePlans = await prisma.userPlan.count({
        where: { userId, status: 'active' },
      })

      if (activePlans === 0) {
        await prisma.user.update({
          where: { id: userId },
          data: { accountStatus: 'inactive' },
        })
      }
    }

    return NextResponse.json({ success: true, expired: expiredPlanIds.length })
  } catch (error) {
    console.error('Expire plans error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
