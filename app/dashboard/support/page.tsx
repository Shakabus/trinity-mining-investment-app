import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import SupportCenterClient from '@/components/dashboard/SupportCenterClient'
import { translate, languageFromCurrency, type LanguageCode } from '@/lib/i18n'
import { getFxRates, isSupportedCurrency, type CurrencyCode } from '@/lib/forex'

const FAQ_ITEMS = [
  {
    question: 'How do I start mining?',
    answer:
      'Choose a plan, complete the payment instructions, and wait for confirmation. Once confirmed, your mining dashboard will begin tracking hashrate, shares, and earnings automatically.',
  },
  {
    question: 'Why are my earnings estimates changing?',
    answer:
      'Estimates adjust based on assigned hashrate, uptime, and network conditions. The system updates estimates on a schedule to reflect real mining performance.',
  },
  {
    question: 'What is a pending withdrawal?',
    answer:
      'Pending means your request has been received and is waiting to be processed. Once processed, the status will update and your activity log will show it.',
  },
  {
    question: 'How do plan upgrades work?',
    answer:
      'When you upgrade, the remaining value on your current plan is credited against the new plan. Your previous earnings are preserved and shown separately as historical.',
  },
  {
    question: 'Why do I see historical earnings?',
    answer:
      'Historical earnings come from older plans and remain visible after upgrades. They can be unlocked and withdrawn once the release window is met.',
  },
  {
    question: 'How do I update my wallet address?',
    answer:
      'Go to Settings, enter the correct wallet addresses, and save. Always double-check the address format before saving.',
  },
]

const HOW_IT_WORKS = [
  {
    title: 'Plans and activation',
    body:
      'Plans define your assigned hashrate, duration, and supported assets. After selecting a plan, follow the payment instructions and submit your proof when ready.',
  },
  {
    title: 'Mining performance',
    body:
      'Your hashrate is designed to stay near the assigned maximum, with small fluctuations. Shares and earnings update as the system tracks mining activity.',
  },
  {
    title: 'Earnings and payouts',
    body:
      'Daily estimates are calculated automatically unless a manual override is applied. Withdrawals are requests that get reviewed before they are processed.',
  },
  {
    title: 'Upgrades and history',
    body:
      'Upgrades apply a credit for unused time on the current plan. Your previous earnings remain visible and can be released based on the system rules.',
  },
]

export default async function SupportPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      supportTickets: {
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      },
    },
  })

  if (!user) {
    redirect('/sign-in')
  }

  const rates = await getFxRates()
  const preferredCurrency: CurrencyCode = isSupportedCurrency(user?.preferredCurrency || '')
    ? (user?.preferredCurrency as CurrencyCode)
    : 'USD'
  const preferredLanguage: LanguageCode = user?.preferredLanguage
    ? (user?.preferredLanguage as LanguageCode)
    : languageFromCurrency(preferredCurrency)
  const t = (key: string) => translate(key, preferredLanguage)

  const tickets = user.supportTickets.map(ticket => ({
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status,
    createdAt: ticket.createdAt.toISOString(),
    lastMessageAt: ticket.lastMessageAt ? ticket.lastMessageAt.toISOString() : null,
    messages: ticket.messages.map(message => ({
      id: message.id,
      senderRole: message.senderRole as 'user' | 'support',
      body: message.body,
      attachmentUrl: message.attachmentUrl,
      attachmentName: message.attachmentName,
      attachmentType: message.attachmentType,
      createdAt: message.createdAt.toISOString(),
    })),
  }))

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-6 py-6 space-y-10">
      <div className="grid gap-6">
        <div
          className="p-6 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{t('supportTitle')}</h1>
          <p className="text-white/70">
            Learn how the platform works, find quick answers, and send a support request.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div
            className="p-6 rounded-3xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
            }}
          >
            <h2 className="text-xl font-semibold text-white mb-4">How it works</h2>
            <div className="space-y-4 text-sm text-white/70">
              {HOW_IT_WORKS.map(item => (
                <div key={item.title}>
                  <div className="text-white font-semibold mb-1">{item.title}</div>
                  <div>{item.body}</div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="p-6 rounded-3xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
            }}
          >
            <h2 className="text-xl font-semibold text-white mb-4">FAQ</h2>
            <div className="space-y-4 text-sm text-white/70">
              {FAQ_ITEMS.map(item => (
                <div key={item.question}>
                  <div className="text-white font-semibold mb-1">{item.question}</div>
                  <div>{item.answer}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <SupportCenterClient tickets={tickets} />
    </div>
  )
}
