import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/forum(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth().protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};

type RateLimitProfile = {
  windowSec: number
  ipLimit: number
  userLimit: number
}

const DEFAULT_READ_LIMIT: RateLimitProfile = {
  windowSec: 60,
  ipLimit: 120,
  userLimit: 240,
}

const DEFAULT_WRITE_LIMIT: RateLimitProfile = {
  windowSec: 60,
  ipLimit: 60,
  userLimit: 120,
}
type RateLimitProfile = {
  windowSec: number
  ipLimit: number
  userLimit: number
}

const DEFAULT_READ_LIMIT: RateLimitProfile = {
  windowSec: 60,
  ipLimit: 120,
  userLimit: 240,
}

const DEFAULT_WRITE_LIMIT: RateLimitProfile = {
  windowSec: 60,
  ipLimit: 60,
  userLimit: 120,
}

const STRICT_ACTION_LIMIT: RateLimitProfile = {
  windowSec: 60,
  ipLimit: 24,
  userLimit: 48,
}

const HEARTBEAT_LIMIT: RateLimitProfile = {
  windowSec: 60,
  ipLimit: 180,
  userLimit: 360,
}

const ADMIN_READ_LIMIT: RateLimitProfile = {
  windowSec: 60,
  ipLimit: 90,
  userLimit: 180,
}

const ADMIN_WRITE_LIMIT: RateLimitProfile = {
  windowSec: 60,
  ipLimit: 40,
  userLimit: 80,
}

const CONTACT_LIMIT: RateLimitProfile = {
  windowSec: 60,
  ipLimit: 8,
  userLimit: 16,
}

const PUBLIC_TRANSLATE_LIMIT: RateLimitProfile = {
  windowSec: 60,
  ipLimit: 600,
  userLimit: 1200,
}

const SUPPORT_LIMIT: RateLimitProfile = {
  windowSec: 60,
  ipLimit: 20,
  userLimit: 40,
}

const isWriteMethod = (method: string) => !['GET', 'HEAD', 'OPTIONS'].includes(method)

const isStrictUserActionPath = (pathname: string) =>
  pathname.includes('withdraw') ||
  pathname.includes('select-plan') ||
  pathname.includes('submit-payment-proof') ||
  pathname.includes('approve-payment') ||
  pathname.includes('reject-payment')

const getRateLimitProfile = (pathname: string, method: string): RateLimitProfile => {
  if (pathname === '/api/user/presence/heartbeat') return HEARTBEAT_LIMIT
  if (pathname === '/api/contact/messages') return CONTACT_LIMIT
  if (pathname.startsWith('/api/user/support')) return SUPPORT_LIMIT
  if (pathname === '/api/public/translate') return PUBLIC_TRANSLATE_LIMIT

  if (pathname.startsWith('/api/admin')) {
    return isWriteMethod(method) ? ADMIN_WRITE_LIMIT : ADMIN_READ_LIMIT
  }

  if (isStrictUserActionPath(pathname)) return STRICT_ACTION_LIMIT

  return isWriteMethod(method) ? DEFAULT_WRITE_LIMIT : DEFAULT_READ_LIMIT
}

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }

  const pathname = req.nextUrl.pathname
  if (pathname.startsWith('/api') && !pathname.startsWith('/api/webhooks') && !pathname.startsWith('/api/cron')) {
    const method = req.method.toUpperCase()
    const profile = getRateLimitProfile(pathname, method)
    const authResult = await auth()
    const userId = authResult.userId
    const ip = getClientIp(req.headers)

    // Apply both IP and user buckets to reduce abuse from shared IP pools.
    const ipRate = await checkRateLimit({
      key: `rl:ip:${method}:${pathname}:${ip}`,
      limit: profile.ipLimit,
      windowSec: profile.windowSec,
    })

    const userRate = userId
      ? await checkRateLimit({
          key: `rl:user:${method}:${pathname}:${userId}`,
          limit: profile.userLimit,
          windowSec: profile.windowSec,
        })
      : null

    const blockedScope = !ipRate.ok ? 'ip' : userRate && !userRate.ok ? 'user' : null

    if (blockedScope) {
      const blockedRate = blockedScope === 'ip' ? ipRate : userRate!
      const retryAfterSec = getRetryAfterSec(blockedRate.resetAt)
      const response = NextResponse.json(
        {
          error: 'Too many requests. Please slow down and retry shortly.',
          code: 'RATE_LIMITED',
          scope: blockedScope,
          retryAfterSec,
        },
        { status: 429 },
      )
      response.headers.set('Retry-After', String(retryAfterSec))
      response.headers.set('X-RateLimit-Limit', String(blockedScope === 'ip' ? profile.ipLimit : profile.userLimit))
      response.headers.set('X-RateLimit-Remaining', String(blockedRate.remaining))
      response.headers.set('X-RateLimit-Reset', String(Math.ceil(blockedRate.resetAt / 1000)))
      response.headers.set('X-RateLimit-Scope', blockedScope)
      return response
    }

    const response = NextResponse.next()
    const combinedRemaining = userRate ? Math.min(ipRate.remaining, userRate.remaining) : ipRate.remaining
    response.headers.set('X-RateLimit-Limit', String(userRate ? profile.userLimit : profile.ipLimit))
    response.headers.set('X-RateLimit-Remaining', String(combinedRemaining))
    response.headers.set(
      'X-RateLimit-Reset',
      String(Math.ceil(Math.max(ipRate.resetAt, userRate?.resetAt ?? ipRate.resetAt) / 1000)),
    )
    response.headers.set('X-RateLimit-IP-Limit', String(profile.ipLimit))
    response.headers.set('X-RateLimit-IP-Remaining', String(ipRate.remaining))
    if (userRate) {
      response.headers.set('X-RateLimit-User-Limit', String(profile.userLimit))
      response.headers.set('X-RateLimit-User-Remaining', String(userRate.remaining))
    }
    return response
  }

  const response = NextResponse.next()
  const referralCode = req.nextUrl.searchParams.get('ref')
  if (referralCode) {
    response.cookies.set('referral_code', referralCode, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
  }

  return response
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
