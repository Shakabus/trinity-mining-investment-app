import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import SupportCenterClient from '@/components/dashboard/SupportCenterClient'
import { translate, languageFromCurrency, type LanguageCode } from '@/lib/i18n'
import { getFxRates, isSupportedCurrency, type CurrencyCode } from '@/lib/forex'

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

  const howItWorks = [
    {
      title: t('howPlansTitle'),
      summary: t('howPlansSummary'),
      body: t('howPlansBodyLong'),
    },
    {
      title: t('howMiningTitle'),
      summary: t('howMiningSummary'),
      body: t('howMiningBodyLong'),
    },
    {
      title: t('howEarningsTitle'),
      summary: t('howEarningsSummary'),
      body: t('howEarningsBodyLong'),
    },
    {
      title: t('howUpgradesTitle'),
      summary: t('howUpgradesSummary'),
      body: t('howUpgradesBodyLong'),
    },
    {
      title: t('howTradingTitle'),
      summary: t('howTradingSummary'),
      body: t('howTradingBodyLong'),
    },
    {
      title: t('howPortfolioTitle'),
      summary: t('howPortfolioSummary'),
      body: t('howPortfolioBodyLong'),
    },
    {
      title: t('howRiskTitle'),
      summary: t('howRiskSummary'),
      body: t('howRiskBodyLong'),
    },
  ]

  const faqItems = [
    { question: t('faq1Q'), answer: t('faq1A') },
    { question: t('faq2Q'), answer: t('faq2A') },
    { question: t('faq3Q'), answer: t('faq3A') },
    { question: t('faq4Q'), answer: t('faq4A') },
    { question: t('faq5Q'), answer: t('faq5A') },
    { question: t('faq6Q'), answer: t('faq6A') },
    { question: t('faq7Q'), answer: t('faq7A') },
    { question: t('faq8Q'), answer: t('faq8A') },
    { question: t('faq9Q'), answer: t('faq9A') },
    { question: t('faq10Q'), answer: t('faq10A') },
    { question: t('faq11Q'), answer: t('faq11A') },
    { question: t('faq12Q'), answer: t('faq12A') },
  ]

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
          <p className="text-white/70">{t('supportIntro')}</p>
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
            <h2 className="text-xl font-semibold text-white mb-4">{t('supportHowItWorksTitle')}</h2>
            <div className="space-y-4 text-sm text-white/70">
              {howItWorks.map(item => (
                <details
                  key={item.title}
                  className="group rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                    <div>
                      <div className="text-white font-semibold">{item.title}</div>
                      <div className="mt-1 text-xs text-white/60">{item.summary}</div>
                    </div>
                    <span className="text-white/60 transition-transform group-open:rotate-180">v</span>
                  </summary>
                  <div className="mt-3 space-y-3 text-sm text-white/70">
                    {item.body.split('\n\n').map((paragraph, index) => (
                      <p key={`${item.title}-${index}`}>{paragraph}</p>
                    ))}
                  </div>
                </details>
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
            <h2 className="text-xl font-semibold text-white mb-4">{t('supportFaqTitle')}</h2>
            <div className="space-y-4 text-sm text-white/70">
              {faqItems.map(item => (
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
