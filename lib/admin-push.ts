import { prisma } from '@/lib/db'

type PushSubscriptionKeys = {
  p256dh: string
  auth: string
}

export type AdminPushSubscriptionInput = {
  endpoint: string
  keys: PushSubscriptionKeys
}

type AdminPushPayload = {
  title: string
  body: string
  href: string
  tag: string
  requireInteraction: boolean
}

type UserActivityPushRule = {
  title: string
  href: string
  requireInteraction: boolean
}

const USER_ACTIVITY_PUSH_RULES: Record<string, UserActivityPushRule> = {
  AccountFundingSubmitted: {
    title: 'Funding request submitted',
    href: '/admin/account-balance',
    requireInteraction: true,
  },
  AccountBalancePlanPurchaseSubmitted: {
    title: 'Mining plan payment pending review',
    href: '/admin/payments',
    requireInteraction: true,
  },
  AccountBalanceTradingPurchaseSubmitted: {
    title: 'Trading plan payment pending review',
    href: '/admin/payments',
    requireInteraction: true,
  },
  AccountBalanceWithdrawalRequested: {
    title: 'Account withdrawal request',
    href: '/admin/account-balance',
    requireInteraction: true,
  },
  WithdrawalToAccountBalanceRequested: {
    title: 'Mining earnings transfer requested',
    href: '/admin/withdrawals',
    requireInteraction: true,
  },
  TradingWithdrawalToAccountBalanceRequested: {
    title: 'Trading earnings transfer requested',
    href: '/admin/withdrawals',
    requireInteraction: true,
  },
  ReferralWithdrawalToAccountBalanceRequested: {
    title: 'Referral earnings transfer requested',
    href: '/admin/withdrawals',
    requireInteraction: true,
  },
  RealEstateBuyInSubmitted: {
    title: 'Real-estate buy-in submitted',
    href: '/admin/real-estate',
    requireInteraction: true,
  },
  RealEstateWithdrawalRequested: {
    title: 'Real-estate withdrawal request',
    href: '/admin/withdrawals',
    requireInteraction: true,
  },
  SupportTicketCreated: {
    title: 'New support ticket',
    href: '/admin/settings',
    requireInteraction: true,
  },
  SupportMessageSent: {
    title: 'Support ticket updated',
    href: '/admin/settings',
    requireInteraction: true,
  },
  KYCSubmitted: {
    title: 'KYC submitted',
    href: '/admin/kyc',
    requireInteraction: true,
  },
  PlanSelected: {
    title: 'User selected a mining plan',
    href: '/admin/payments',
    requireInteraction: false,
  },
  TradingPlanSelected: {
    title: 'User selected a trading plan',
    href: '/admin/payments',
    requireInteraction: false,
  },
  PlanUpgradeRequested: {
    title: 'Plan upgrade requested',
    href: '/admin/payments',
    requireInteraction: false,
  },
  WalletUpdated: {
    title: 'Wallet details updated',
    href: '/admin/users',
    requireInteraction: false,
  },
  ProfileUpdated: {
    title: 'Profile details updated',
    href: '/admin/users',
    requireInteraction: false,
  },
  WalletConversionCompleted: {
    title: 'Wallet conversion completed',
    href: '/admin/account-balance',
    requireInteraction: false,
  },
  UserLoginLocation: {
    title: 'User login location detected',
    href: '/admin/users',
    requireInteraction: false,
  },
}

let vapidConfigured = false
let webPushModulePromise: Promise<WebPushModule | null> | null = null

function isMissingSubscriptionTableError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : ''
  const message = error instanceof Error ? error.message : ''
  return (
    code === 'P2021' ||
    (code === 'P2010' && message.includes('admin_push_subscriptions')) ||
    message.includes('admin_push_subscriptions')
  )
}

function getPushEnv() {
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY?.trim() || ''
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY?.trim() || ''
  const subject = process.env.WEB_PUSH_SUBJECT?.trim() || ''
  const enabled = Boolean(publicKey && privateKey && subject)
  return { enabled, publicKey, privateKey, subject }
}

type WebPushModule = {
  setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void
  sendNotification: (
    subscription: unknown,
    payload?: string,
    options?: { TTL?: number }
  ) => Promise<unknown>
}

async function getWebPushModule() {
  if (webPushModulePromise) return webPushModulePromise
  webPushModulePromise = (async () => {
    try {
      const importer = new Function('specifier', 'return import(specifier)') as (
        specifier: string
      ) => Promise<{ default?: WebPushModule } | WebPushModule>
      const loaded = await importer('web-push')
      return (loaded as { default?: WebPushModule }).default ?? (loaded as WebPushModule)
    } catch {
      return null
    }
  })()
  return webPushModulePromise
}

function ensureVapidConfigured(module: WebPushModule, env: ReturnType<typeof getPushEnv>) {
  if (vapidConfigured) return
  module.setVapidDetails(env.subject, env.publicKey, env.privateKey)
  vapidConfigured = true
}

function normalizePushText(value: string | null | undefined) {
  const text = (value || '').trim().replace(/\s+/g, ' ')
  if (text.length <= 180) return text
  return `${text.slice(0, 177)}...`
}

function userDisplayName(fullName: string | null, email: string) {
  const display = (fullName || '').trim()
  return display.length > 0 ? display : email
}

function parseStatusCode(error: unknown) {
  if (!error || typeof error !== 'object') return null
  const statusCode = (error as { statusCode?: unknown }).statusCode
  if (typeof statusCode === 'number' && Number.isFinite(statusCode)) return statusCode
  return null
}

async function dispatchToActiveAdminDevices(payload: AdminPushPayload) {
  const env = getPushEnv()
  if (!env.enabled) return
  const webPushModule = await getWebPushModule()
  if (!webPushModule) {
    console.warn('Admin push disabled: web-push package is not available in runtime.')
    return
  }
  ensureVapidConfigured(webPushModule, env)

  let subscriptions: Array<{
    id: number
    endpoint: string
    p256dh: string
    auth: string
  }> = []

  try {
    subscriptions = await prisma.adminPushSubscription.findMany({
      where: {
        isActive: true,
        adminUser: {
          role: 'admin',
        },
      },
      select: {
        id: true,
        endpoint: true,
        p256dh: true,
        auth: true,
      },
      take: 500,
    })
  } catch (error) {
    if (isMissingSubscriptionTableError(error)) return
    throw error
  }

  if (!subscriptions.length) return

  const staleIds: number[] = []
  await Promise.allSettled(
    subscriptions.map(async subscription => {
      const subscriptionPayload = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      }
      try {
        await webPushModule.sendNotification(subscriptionPayload as any, JSON.stringify(payload), {
          TTL: 90,
        })
      } catch (error) {
        const statusCode = parseStatusCode(error)
        if (statusCode === 404 || statusCode === 410) {
          staleIds.push(subscription.id)
          return
        }
        console.error('Admin push send error:', error)
      }
    })
  )

  if (staleIds.length) {
    try {
      await prisma.adminPushSubscription.updateMany({
        where: { id: { in: staleIds } },
        data: { isActive: false },
      })
    } catch (error) {
      if (isMissingSubscriptionTableError(error)) return
      console.error('Admin push stale cleanup error:', error)
    }
  }
}

export function getAdminPushConfig() {
  const env = getPushEnv()
  return {
    enabled: env.enabled,
    publicKey: env.publicKey,
  }
}

export async function upsertAdminPushSubscription(params: {
  adminUserId: number
  subscription: AdminPushSubscriptionInput
  userAgent: string | null
}) {
  try {
    return await prisma.adminPushSubscription.upsert({
      where: { endpoint: params.subscription.endpoint },
      update: {
        adminUserId: params.adminUserId,
        p256dh: params.subscription.keys.p256dh,
        auth: params.subscription.keys.auth,
        userAgent: params.userAgent,
        isActive: true,
        lastSeenAt: new Date(),
      },
      create: {
        adminUserId: params.adminUserId,
        endpoint: params.subscription.endpoint,
        p256dh: params.subscription.keys.p256dh,
        auth: params.subscription.keys.auth,
        userAgent: params.userAgent,
        isActive: true,
        lastSeenAt: new Date(),
      },
      select: { id: true },
    })
  } catch (error) {
    if (isMissingSubscriptionTableError(error)) {
      return null
    }
    throw error
  }
}

export async function deactivateAdminPushSubscription(params: {
  adminUserId: number
  endpoint: string
}) {
  try {
    await prisma.adminPushSubscription.updateMany({
      where: {
        adminUserId: params.adminUserId,
        endpoint: params.endpoint,
      },
      data: {
        isActive: false,
      },
    })
  } catch (error) {
    if (isMissingSubscriptionTableError(error)) return
    throw error
  }
}

export async function notifyAdminsAboutUserActivity(params: {
  userId: number
  action: string
  detail?: string | null
}) {
  const rule = USER_ACTIVITY_PUSH_RULES[params.action]
  if (!rule) return

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, role: true, fullName: true, email: true },
  })
  if (!user || user.role !== 'user') return

  const payload: AdminPushPayload = {
    title: rule.title,
    body:
      `${userDisplayName(user.fullName, user.email)}: ` +
      (normalizePushText(params.detail) || 'New activity recorded.'),
    href: rule.href,
    tag: `user-activity-${params.action}-${user.id}`,
    requireInteraction: rule.requireInteraction,
  }

  try {
    await dispatchToActiveAdminDevices(payload)
  } catch (error) {
    console.error('Admin push user-activity notify error:', error)
  }
}

export async function notifyAdminsAboutNewUserSignup(params: {
  userId: number
  fullName: string | null
  email: string
}) {
  const payload: AdminPushPayload = {
    title: 'New user registration',
    body: `${userDisplayName(params.fullName, params.email)} joined the platform.`,
    href: '/admin/users',
    tag: `new-user-${params.userId}`,
    requireInteraction: false,
  }

  try {
    await dispatchToActiveAdminDevices(payload)
  } catch (error) {
    console.error('Admin push new-user notify error:', error)
  }
}
