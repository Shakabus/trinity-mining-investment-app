'use client'

import { useState } from 'react'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, type LanguageCode } from '@/lib/i18n'

export default function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage()
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const handleChange = async (value: LanguageCode) => {
    setLanguage(value)
    setIsSaving(true)
    setStatus(null)
    try {
      const response = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredLanguage: value }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Failed to update language.')
      }
      setStatus('Saved')
      setTimeout(() => setStatus(null), 1500)
    } catch (error: any) {
      setStatus(error?.message || 'Failed to update language.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
      }}
    >
      <div className="text-sm text-white/70 whitespace-nowrap">{t('language')}</div>
      <select
        value={language}
        onChange={event => handleChange(event.target.value as LanguageCode)}
        className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
        disabled={isSaving}
      >
        {SUPPORTED_LANGUAGES.map(code => (
          <option key={code} value={code} style={{ color: '#000000' }}>
            {LANGUAGE_LABELS[code]}
          </option>
        ))}
      </select>
      {status && <div className="text-xs text-white/60">{status}</div>}
    </div>
  )
}
