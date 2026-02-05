import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import EmptyState from '@/components/ui/EmptyState'
import { Activity } from 'lucide-react'
import { translate, languageFromCurrency, type LanguageCode } from '@/lib/i18n'
import { getFxRates, isSupportedCurrency, type CurrencyCode } from '@/lib/forex'

function formatDate(value: Date) {
  return value.toLocaleString()
}

export default async function ActivityPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      userActivityLogs: {
        orderBy: { createdAt: 'desc' },
        take: 50,
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

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{t('activityTitle')}</h1>
        <p className="text-white/70">{t('activitySubtitle')}</p>
      </div>

      <div
        className="p-6 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        {user.userActivityLogs.length === 0 ? (
          <EmptyState
            title={t('activityEmptyTitle')}
            description={t('activityEmptyDescription')}
            icon={<Activity className="text-white/70 mx-auto" size={36} />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/50 text-left">
                  <th className="py-2">{t('activityTableDate')}</th>
                  <th className="py-2">{t('activityTableAction')}</th>
                  <th className="py-2">{t('activityTableDetails')}</th>
                </tr>
              </thead>
              <tbody>
                {user.userActivityLogs.map(entry => (
                  <tr key={entry.id} className="border-t border-white/10">
                    <td className="py-2 text-white/80">{formatDate(entry.createdAt)}</td>
                    <td className="py-2 text-white/80">{entry.action}</td>
                    <td className="py-2 text-white/70">{entry.detail || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
