'use client'

import { createContext, useContext, useMemo } from 'react'
import type { CurrencyCode, FxRates } from '@/lib/forex'
import { convertUsd, formatCurrency } from '@/lib/forex'

type CurrencyContextValue = {
  currency: CurrencyCode
  rates: FxRates
  format: (amountUsd: number) => string
  convert: (amountUsd: number) => number
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

export function CurrencyProvider({
  currency,
  rates,
  children,
}: {
  currency: CurrencyCode
  rates: FxRates
  children: React.ReactNode
}) {
  const value = useMemo(() => {
    return {
      currency,
      rates,
      format: (amountUsd: number) => formatCurrency(convertUsd(amountUsd, rates, currency), currency),
      convert: (amountUsd: number) => convertUsd(amountUsd, rates, currency),
    }
  }, [currency, rates])

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext)
  if (!ctx) {
    throw new Error('useCurrency must be used within CurrencyProvider')
  }
  return ctx
}
