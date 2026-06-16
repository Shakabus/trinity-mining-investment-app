'use client'

import { useState } from 'react'
import LoadingButton from '@/components/ui/LoadingButton'
import { SUPPORTED_CURRENCIES, type CurrencyCode } from '@/lib/forex'
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, type LanguageCode } from '@/lib/i18n'
import { COUNTRY_OPTIONS, isSupportedCountryName } from '@/lib/countries'
import { useLanguage } from '@/components/i18n/LanguageProvider'

interface AccountSettingsFormProps {
  fullName: string
  phone: string
  countryOfOrigin: string
  preferredCurrency: CurrencyCode
  preferredLanguage: LanguageCode
}

export default function AccountSettingsForm({
  fullName,
  phone,
  countryOfOrigin,
  preferredCurrency,
  preferredLanguage,
}: AccountSettingsFormProps) {
  const { t } = useLanguage()
  const [nameValue, setNameValue] = useState(fullName)
  const [phoneValue, setPhoneValue] = useState(phone)
  const [countryOfOriginValue, setCountryOfOriginValue] = useState(countryOfOrigin)
  const [currencyValue, setCurrencyValue] = useState<CurrencyCode>(preferredCurrency)
  const [languageValue, setLanguageValue] = useState<LanguageCode>(preferredLanguage)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const countryOptions = isSupportedCountryName(countryOfOrigin)
    ? COUNTRY_OPTIONS
    : ([countryOfOrigin, ...COUNTRY_OPTIONS].filter(Boolean) as readonly string[])

  const handleSubmit = async () => {
    const trimmedName = nameValue.trim()
    const trimmedPhone = phoneValue.trim()
    const trimmedCountryOfOrigin = countryOfOriginValue.trim()

    if (!trimmedName) {
      setStatus({ type: 'error', message: t('fullNameRequiredError') })
      return
    }

    if (trimmedName.length < 2) {
      setStatus({ type: 'error', message: t('fullNameTooShortError') })
      return
    }

    if (trimmedPhone.length > 0) {
      const phoneAllowed = /^[0-9+()\- ]+$/.test(trimmedPhone)
      const phoneDigits = trimmedPhone.replace(/\D/g, '')
      if (!phoneAllowed) {
        setStatus({ type: 'error', message: t('phoneInvalidError') })
        return
      }
      if (phoneDigits.length < 7 || phoneDigits.length > 15) {
        setStatus({ type: 'error', message: t('phoneLengthError') })
        return
      }
    }

    if (trimmedCountryOfOrigin.length > 0 && !isSupportedCountryName(trimmedCountryOfOrigin)) {
      setStatus({ type: 'error', message: 'Please select a valid country of origin.' })
      return
    }

    setIsSaving(true)
    setStatus(null)

    try {
      const response = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: trimmedName,
          phone: trimmedPhone,
          countryOfOrigin: trimmedCountryOfOrigin,
          preferredCurrency: currencyValue,
          preferredLanguage: languageValue,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setStatus({ type: 'error', message: data?.error || t('profileSaveFailed') })
        return
      }

      setStatus({ type: 'success', message: t('profileUpdated') })
    } catch {
      setStatus({ type: 'error', message: t('networkError') })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Full Name */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          {t('fullNameLabel')} <span className="text-red-300">*</span>
        </label>
        <input
          type="text"
          value={nameValue}
          onChange={event => setNameValue(event.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none text-sm md:text-base"
          placeholder={t('fullNamePlaceholder')}
        />
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">{t('phoneLabel')}</label>
        <input
          type="tel"
          value={phoneValue}
          onChange={event => setPhoneValue(event.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none text-sm md:text-base"
          placeholder={t('phonePlaceholder')}
        />
      </div>

      {/* Preferred Currency */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">Country of origin</label>
        <select
          value={countryOfOriginValue}
          onChange={event => setCountryOfOriginValue(event.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none text-sm md:text-base"
        >
          <option value="" style={{ color: '#000000' }}>
            Select country
          </option>
          {countryOptions.map(country => (
            <option key={country} value={country} style={{ color: '#000000' }}>
              {country}
            </option>
          ))}
        </select>
      </div>

      {/* Preferred Currency */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">{t('preferredCurrencyLabel')}</label>
        <select
          value={currencyValue}
          onChange={event => setCurrencyValue(event.target.value as CurrencyCode)}
          className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none text-sm md:text-base"
        >
          {SUPPORTED_CURRENCIES.map(code => (
            <option key={code} value={code} style={{ color: '#000000' }}>
              {code}
            </option>
          ))}
        </select>
        <p className="text-xs text-white/50 mt-2">{t('preferredCurrencyHelp')}</p>
      </div>

      {/* Preferred Language */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">{t('preferredLanguageLabel')}</label>
        <select
          value={languageValue}
          onChange={event => setLanguageValue(event.target.value as LanguageCode)}
          className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none text-sm md:text-base"
        >
          {SUPPORTED_LANGUAGES.map(code => (
            <option key={code} value={code} style={{ color: '#000000' }}>
              {LANGUAGE_LABELS[code]}
            </option>
          ))}
        </select>
        <p className="text-xs text-white/50 mt-2">{t('preferredLanguageHelp')}</p>
      </div>

      {status && (
        <div
          className="px-4 py-3 rounded-lg text-sm"
          style={{
            background: status.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: status.type === 'success' ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(239,68,68,0.4)',
            color: status.type === 'success' ? '#6ee7b7' : '#fecaca',
          }}
        >
          {status.message}
        </div>
      )}

      {/* Save Button */}
      <div className="pt-2">
        <LoadingButton
          onClick={handleSubmit}
          isLoading={isSaving}
          loadingText={t('saving')}
          className="w-full sm:w-auto px-6 py-3 rounded-full font-semibold transition-all text-sm md:text-base disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, #582dff, #3a137a)',
            color: '#ffffff',
          }}
        >
          {t('saveChanges')}
        </LoadingButton>
      </div>
    </div>
  )
}
