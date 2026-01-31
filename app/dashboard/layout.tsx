import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import DashboardLayoutClient from '@/components/dashboard/DashboardLayoutClient'
import { createUniqueReferralCode, normalizeReferralCode } from '@/lib/referral'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // Get or create user in database
  const clerkUser = await currentUser()
  
  const cookieStore = await cookies()
  const referralCookie = normalizeReferralCode(cookieStore.get('referral_code')?.value)

  let user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  })

  // If user doesn't exist in our database, create them
  if (!user && clerkUser) {
    const referralCode = await createUniqueReferralCode()
    const referrer = referralCookie
      ? await prisma.user.findUnique({
          where: { referralCode: referralCookie },
        })
      : null

    user = await prisma.user.create({
      data: {
        clerkUserId: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        fullName: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || null,
        role: 'user',
        accountStatus: 'inactive',
        referralCode: referralCode,
        referredById: referrer ? referrer.id : null,
      }
    })
  } else if (user) {
    if (!user.referralCode) {
      const referralCode = await createUniqueReferralCode()
      await prisma.user.update({
        where: { id: user.id },
        data: { referralCode },
      })
      user = { ...user, referralCode }
    }

    if (!user.referredById && referralCookie) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: referralCookie },
      })
      if (referrer && referrer.id !== user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { referredById: referrer.id },
        })
        user = { ...user, referredById: referrer.id }
      }
    }
  }

  return (
    <DashboardLayoutClient user={user}>
      {children}
    </DashboardLayoutClient>
  )
}
