import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import DashboardLayoutClient from '@/components/dashboard/DashboardLayoutClient'
import { createUniqueReferralCode, normalizeReferralCode } from '@/lib/referral'
import { getFxRates, isSupportedCurrency, type CurrencyCode } from '@/lib/forex'
import { isSupportedLanguage, languageFromCurrency, type LanguageCode } from '@/lib/i18n'

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

  const rates = await getFxRates()
  const preferredCurrency = isSupportedCurrency(user?.preferredCurrency || '')
    ? (user?.preferredCurrency as CurrencyCode)
    : 'USD'
  const preferredLanguage: LanguageCode = isSupportedLanguage(user?.preferredLanguage || '')
    ? (user?.preferredLanguage as LanguageCode)
    : languageFromCurrency(preferredCurrency)
  const [hasActiveMining, hasActiveTrading] = user
    ? await Promise.all([
        prisma.userPlan.count({ where: { userId: user.id, status: 'active' } }),
        prisma.tradingUserPlan.count({ where: { userId: user.id, status: 'active' } }),
      ])
    : [0, 0]
  const accountStatusOverride = hasActiveMining > 0 || hasActiveTrading > 0 ? 'active' : undefined

  return (
    <DashboardLayoutClient
      user={user}
      accountStatusOverride={accountStatusOverride}
      preferredLanguage={preferredLanguage}
      preferredCurrency={preferredCurrency}
      rates={rates}
    >
      {children}
    </DashboardLayoutClient>
  )
}
