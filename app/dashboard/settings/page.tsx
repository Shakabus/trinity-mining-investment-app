import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import AccountSettingsForm from '@/components/dashboard/AccountSettingsForm'
import { isSupportedCurrency, type CurrencyCode } from '@/lib/forex'
import { translate, isSupportedLanguage, type LanguageCode, languageFromCurrency } from '@/lib/i18n'

export default async function SettingsAccountPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId }
  })

  const preferredCurrency: CurrencyCode = isSupportedCurrency(user?.preferredCurrency || '')
    ? (user?.preferredCurrency as CurrencyCode)
    : 'USD'
  const preferredLanguage: LanguageCode = isSupportedLanguage(user?.preferredLanguage || '')
    ? (user?.preferredLanguage as LanguageCode)
    : languageFromCurrency(preferredCurrency)
  const t = (key: string) => translate(key, preferredLanguage)

  return (
    <div 
      className="p-6 md:p-8 rounded-3xl"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
      }}
    >
      <h2 className="text-2xl font-bold text-white mb-6">{t('accountInformation')}</h2>
      
      <div className="space-y-6">
        {/* Email (Read-only from Clerk) */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">{t('emailAddress')}</label>
          <div className="px-4 py-3 rounded-lg bg-white/5 border border-white/10">
            <div className="text-white text-sm md:text-base">{user?.email}</div>
            <div className="text-xs text-white/50 mt-1">{t('managedByProvider')}</div>
          </div>
        </div>

        <AccountSettingsForm
          fullName={user?.fullName || ''}
          phone={user?.phone || ''}
          preferredCurrency={
            isSupportedCurrency(user?.preferredCurrency || '')
              ? (user?.preferredCurrency as CurrencyCode)
              : 'USD'
          }
          preferredLanguage={
            isSupportedLanguage(user?.preferredLanguage || '')
              ? (user?.preferredLanguage as LanguageCode)
              : languageFromCurrency(
                  isSupportedCurrency(user?.preferredCurrency || '')
                    ? (user?.preferredCurrency as CurrencyCode)
                    : 'USD'
                )
          }
        />

        {/* Member Since */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">{t('memberSince')}</label>
          <div className="px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm md:text-base">
            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }) : t('notAvailable')}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 pt-6">
          <h3 className="text-lg font-semibold text-white mb-4">{t('activeSessions')}</h3>
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="text-white font-medium text-sm md:text-base">{t('currentSession')}</div>
                <div className="text-xs md:text-sm text-white/60">
                  {t('sessionDevice').replace('{date}', new Date().toLocaleDateString())}
                </div>
              </div>
              <div className="px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30 text-green-300 text-xs font-medium w-fit">
                {t('activeNow')}
              </div>
            </div>
          </div>
          <p className="text-xs text-white/50 mt-3">
            {t('securityHelp')}
          </p>
        </div>

        <div className="pt-2"></div>
      </div>
    </div>
  )
}
