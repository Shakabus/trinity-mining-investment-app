import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rateLimit'

// Define which routes require authentication
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/admin(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }

  const pathname = req.nextUrl.pathname
  if (pathname.startsWith('/api') && !pathname.startsWith('/api/webhooks') && !pathname.startsWith('/api/cron')) {
    const authResult = await auth()
    const userId = authResult.userId
    const forwardedFor = req.headers.get('x-forwarded-for') || ''
    const ip = forwardedFor.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
    const key = `rl:${pathname}:${userId || ip}`
    const limit = pathname.startsWith('/api/admin') ? 20 : pathname.startsWith('/api/mining') ? 120 : 60
    const windowSec = 60
    const rate = await checkRateLimit({ key, limit, windowSec })

    const response = rate.ok
      ? NextResponse.next()
      : NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 })

    response.headers.set('X-RateLimit-Limit', String(limit))
    response.headers.set('X-RateLimit-Remaining', String(rate.remaining))
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(rate.resetAt / 1000)))

    if (!rate.ok) {
      response.headers.set('Retry-After', String(windowSec))
      return response
    }
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
