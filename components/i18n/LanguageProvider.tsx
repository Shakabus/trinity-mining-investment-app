'use client'

import { createContext, useContext, useMemo, useState } from 'react'
import { type LanguageCode, translate } from '@/lib/i18n'

interface LanguageContextValue {
  language: LanguageCode
  setLanguage: (value: LanguageCode) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({
  language: initialLanguage,
  children,
}: {
  language: LanguageCode
  children: React.ReactNode
}) {
  const [language, setLanguage] = useState<LanguageCode>(initialLanguage)

  const value = useMemo<LanguageContextValue>(() => {
    return {
      language,
      setLanguage,
      t: (key: string) => translate(key, language),
    }
  }, [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error('useLanguage must be used inside LanguageProvider')
  }
  return ctx
}
