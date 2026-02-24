'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Globe2 } from 'lucide-react'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, type LanguageCode } from '@/lib/i18n'

interface LanguageToggleProps {
  variant?: 'panel' | 'icon'
}

export default function LanguageToggle({ variant = 'panel' }: LanguageToggleProps) {
  const { language, setLanguage, t } = useLanguage()
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  const handleChange = async (value: LanguageCode) => {
    const previousLanguage = language
    setLanguage(value)
    setIsSaving(true)
    setStatus(null)
    try {
      const response = await fetch('/api/user/update-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredLanguage: value }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || t('languageUpdateFailed'))
      }
      setStatus(t('languageSaved'))
      setIsOpen(false)
      router.refresh()
      setTimeout(() => setStatus(null), 1500)
    } catch (error: any) {
      setLanguage(previousLanguage)
      setStatus(error?.message || t('languageUpdateFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  if (variant === 'icon') {
    return (
      <div ref={wrapperRef} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(open => !open)}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 md:h-10 md:w-10"
          aria-label={t('language')}
          title={`${t('language')}: ${LANGUAGE_LABELS[language]}`}
        >
          <Globe2 size={18} />
          {isSaving && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-300" />}
        </button>

        {isOpen && (
          <div
            className="absolute right-0 z-[90] mt-2 w-52 rounded-2xl p-2"
            style={{
              background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.92))',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {SUPPORTED_LANGUAGES.map(code => (
              <button
                key={code}
                type="button"
                onClick={() => handleChange(code)}
                disabled={isSaving}
                className="w-full rounded-xl px-3 py-2 text-left text-sm text-white/90 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex items-center justify-between gap-2">
                  <span>{LANGUAGE_LABELS[code]}</span>
                  {language === code ? <Check size={14} className="text-emerald-300" /> : null}
                </span>
              </button>
            ))}
            {status ? <div className="px-3 pt-2 text-[11px] text-white/65">{status}</div> : null}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className="flex w-fit max-w-full items-center gap-3 px-4 py-3 rounded-2xl"
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
