import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { logUserActivity } from '@/lib/user-activity'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : ''
    const phone = typeof body.phone === 'string' ? body.phone.trim() : ''

    if (fullName.length === 0) {
      return NextResponse.json({ error: 'Full name is required.' }, { status: 400 })
    }

    if (fullName.length < 2) {
      return NextResponse.json({ error: 'Full name must be at least 2 characters.' }, { status: 400 })
    }

    if (fullName.length > 80) {
      return NextResponse.json({ error: 'Full name is too long.' }, { status: 400 })
    }

    if (phone.length > 0) {
      if (phone.length < 7) {
        return NextResponse.json({ error: 'Phone number looks too short.' }, { status: 400 })
      }
      if (phone.length > 30) {
        return NextResponse.json({ error: 'Phone number is too long.' }, { status: 400 })
      }
      if (!/^[+()\-.\s\d]+$/.test(phone)) {
        return NextResponse.json({ error: 'Phone number contains invalid characters.' }, { status: 400 })
      }
      const digitCount = phone.replace(/\D/g, '').length
      if (digitCount < 7) {
        return NextResponse.json({ error: 'Phone number must include at least 7 digits.' }, { status: 400 })
      }
    }

    const currentUser = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    })

    await prisma.user.update({
      where: { clerkUserId: userId },
      data: {
        fullName: fullName,
        phone: phone.length > 0 ? phone : null,
      },
    })

    if (currentUser) {
      const changedFields: string[] = []
      if ((currentUser.fullName || '') !== (fullName.length > 0 ? fullName : '')) {
        changedFields.push('full name')
      }
      if ((currentUser.phone || '') !== (phone.length > 0 ? phone : '')) {
        changedFields.push('phone')
      }

      if (changedFields.length > 0) {
        await logUserActivity({
          userId: currentUser.id,
          action: 'ProfileUpdated',
          detail: `Updated ${changedFields.join(', ')}.`,
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
