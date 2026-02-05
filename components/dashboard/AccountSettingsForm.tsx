'use client'

import { useState } from 'react'
import LoadingButton from '@/components/ui/LoadingButton'
import { SUPPORTED_CURRENCIES, type CurrencyCode } from '@/lib/forex'
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, type LanguageCode } from '@/lib/i18n'

interface AccountSettingsFormProps {
  fullName: string
  phone: string
  preferredCurrency: CurrencyCode
  preferredLanguage: LanguageCode
}

export default function AccountSettingsForm({
  fullName,
  phone,
  preferredCurrency,
  preferredLanguage,
}: AccountSettingsFormProps) {
  const [nameValue, setNameValue] = useState(fullName)
  const [phoneValue, setPhoneValue] = useState(phone)
  const [currencyValue, setCurrencyValue] = useState<CurrencyCode>(preferredCurrency)
  const [languageValue, setLanguageValue] = useState<LanguageCode>(preferredLanguage)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async () => {
    const trimmedName = nameValue.trim()
    const trimmedPhone = phoneValue.trim()

    if (!trimmedName) {
      setStatus({ type: 'error', message: 'Full name is required.' })
      return
    }

    if (trimmedName.length < 2) {
      setStatus({ type: 'error', message: 'Full name must be at least 2 characters.' })
      return
    }

    if (trimmedPhone.length > 0) {
      const phoneAllowed = /^[0-9+()\- ]+$/.test(trimmedPhone)
      const phoneDigits = trimmedPhone.replace(/\D/g, '')
      if (!phoneAllowed) {
        setStatus({ type: 'error', message: 'Phone number contains invalid characters.' })
        return
      }
      if (phoneDigits.length < 7 || phoneDigits.length > 15) {
        setStatus({ type: 'error', message: 'Phone number must be 7 to 15 digits.' })
        return
      }
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
          preferredCurrency: currencyValue,
          preferredLanguage: languageValue,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setStatus({ type: 'error', message: data?.error || 'Failed to save profile.' })
        return
      }

      setStatus({ type: 'success', message: 'Profile updated successfully.' })
    } catch {
      setStatus({ type: 'error', message: 'Network error. Please try again.' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Full Name */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          Full Name <span className="text-red-300">*</span>
        </label>
        <input
          type="text"
          value={nameValue}
          onChange={event => setNameValue(event.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none text-sm md:text-base"
          placeholder="Enter your full name"
        />
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">Phone Number (Optional)</label>
        <input
          type="tel"
          value={phoneValue}
          onChange={event => setPhoneValue(event.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none text-sm md:text-base"
          placeholder="+1 (555) 000-0000"
        />
      </div>

      {/* Preferred Currency */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">Preferred Currency</label>
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
        <p className="text-xs text-white/50 mt-2">
          All user-side currency values will display in this currency.
        </p>
      </div>

      {/* Preferred Language */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">Language</label>
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
        <p className="text-xs text-white/50 mt-2">
          Dashboard labels will update to your selected language.
        </p>
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
          loadingText="Saving..."
          className="w-full sm:w-auto px-6 py-3 rounded-full font-semibold transition-all text-sm md:text-base disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, #582dff, #3a137a)',
            color: '#ffffff',
          }}
        >
          Save Changes
        </LoadingButton>
      </div>
    </div>
  )
}
