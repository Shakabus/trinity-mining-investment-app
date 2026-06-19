export const dynamic = 'force-dynamic'

import { auth, clerkClient, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { prisma } from '@/lib/db'
import DashboardLayoutClient from '@/components/dashboard/DashboardLayoutClient'
import { createUniqueReferralCode, normalizeReferralCode } from '@/lib/referral'
import { getFxRates, isSupportedCurrency, type CurrencyCode } from '@/lib/forex'
import { isSupportedLanguage, languageFromCurrency, type LanguageCode } from '@/lib/i18n'
import { sendWelcomeEmailOnce } from '@/lib/welcome-email'
import {
  buildLocationEventDetail,
  extractApproxLocation,
  hasApproxLocationData,
} from '@/lib/location-tracking'
import { logUserActivity } from '@/lib/user-activity'
import {
  resolveCountryNameFromCountry,
  resolveLocaleDefaultsFromCountry,
} from '@/lib/geo-defaults'

const SESSION_INACTIVITY_LIMIT_MS = 24 * 60 * 60 * 1000

function renderDashboardFallback(text = 'We hit a server error while loading your dashboard. Please refresh the page or try again later.') {
  return (
    <div className="p-6 md:p-8">
      <div
        className="rounded-3xl p-6 md:p-8"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <h1 className="text-xl md:text-2xl font-bold text-white">Dashboard temporarily unavailable</h1>
        <p className="text-sm md:text-base text-white/75 mt-2">
          {text}
        </p>
      </div>
    </div>
  )
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let userId: string | null = null
  let sessionId: string | null = null

  try {
    const authResult = await auth()
    userId = authResult.userId
    sessionId = authResult.sessionId
  } catch (error) {
    console.error('[dashboard] auth error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    return renderDashboardFallback()
  }

  const requestTime = new Date()
  
  if (!userId) {
    redirect('/sign-in')
  }

  let user: Awaited<ReturnType<typeof prisma.user.findUnique>> | null = null

  try {
    // Get or create user in database
    const clerkUser = await currentUser().catch(error => {
      console.error('[dashboard] currentUser failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      return null
    })

    const cookieStore = await cookies()
    const requestHeaders = await headers()
    const loginLocation = extractApproxLocation(requestHeaders)
    const geoCountryName = resolveCountryNameFromCountry(loginLocation.country)
    const geoDefaults = resolveLocaleDefaultsFromCountry(loginLocation.country)
    const referralCookie = normalizeReferralCode(cookieStore.get('referral_code')?.value)

    user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    })
    let createdNewUser = false

  // If user doesn't exist in our database, attach by email or create.
  // This avoids crashes when a prior account row already exists with the same email.
  if (!user && clerkUser) {
    const email = (clerkUser.emailAddresses[0]?.emailAddress || '').trim().toLowerCase()
    const fullName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || null
    const referralCode = await createUniqueReferralCode()
    const referrer = referralCookie
      ? await prisma.user.findUnique({
          where: { referralCode: referralCookie },
        })
      : null

    const existingByEmail = email
      ? await prisma.user.findUnique({
          where: { email },
        })
      : null

    if (existingByEmail) {
      user = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          clerkUserId: userId,
          fullName,
        },
      })
    } else {
      try {
        user = await prisma.user.create({
          data: {
            clerkUserId: userId,
            email,
            fullName,
            role: 'user',
            accountStatus: 'inactive',
            countryOfOrigin: geoCountryName ?? undefined,
            preferredCurrency: geoDefaults?.preferredCurrency,
            preferredLanguage: geoDefaults?.preferredLanguage,
            referralCode,
            referredById: referrer ? referrer.id : null,
          },
        })
        createdNewUser = true
      } catch {
        // Concurrent request may have created the user between checks.
        user =
          (await prisma.user.findUnique({ where: { clerkUserId: userId } })) ||
          (email ? await prisma.user.findUnique({ where: { email } }) : null)
      }
    }
  }

  if (createdNewUser && user) {
    if (hasApproxLocationData(loginLocation)) {
      await logUserActivity({
        userId: user.id,
        action: 'UserSignupLocation',
        detail: buildLocationEventDetail({
          event: 'signup',
          source: 'dashboard_layout',
          location: loginLocation,
        }),
      })
    }
  }

  if (user?.email) {
    try {
      await sendWelcomeEmailOnce({
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        source: 'dashboard_layout',
      })
    } catch (error) {
      console.error('[dashboard] welcome email flow failed', {
        userId: user.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  if (user) {
    try {
      if (user.lastSeenAt) {
        const inactiveForMs = requestTime.getTime() - user.lastSeenAt.getTime()
        if (inactiveForMs > SESSION_INACTIVITY_LIMIT_MS) {
          if (sessionId) {
            try {
              const clerk = await clerkClient()
              await clerk.sessions.revokeSession(sessionId)
            } catch (error) {
              console.error('[dashboard] failed to revoke stale session', {
                userId,
                sessionId,
                error: error instanceof Error ? error.message : String(error),
              })
            }
          }

          await prisma.user.update({
            where: { id: user.id },
            data: {
              lastSeenAt: requestTime,
              currentSessionStartedAt: null,
            },
          })

          redirect('/sign-in?reason=session-timeout')
        }
      }
    } catch (error) {
      console.error('[dashboard] session expiry check failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      return renderDashboardFallback('Unable to verify your dashboard session. Please try again.')
    }

    if (!user.countryOfOrigin && geoCountryName) {
      const shouldAutoAssignLocaleDefaults =
        user.preferredCurrency === 'USD' &&
        user.preferredLanguage === 'en' &&
        Boolean(geoDefaults)

      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          countryOfOrigin: geoCountryName,
          ...(shouldAutoAssignLocaleDefaults
            ? {
                preferredCurrency: geoDefaults!.preferredCurrency,
                preferredLanguage: geoDefaults!.preferredLanguage,
              }
            : {}),
        },
      })
    }

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
  } catch (error) {
    console.error('[dashboard] layout initialization failed', {
      userId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    return renderDashboardFallback()
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
