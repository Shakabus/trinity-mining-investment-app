'use client'

import { useEffect, useMemo, useState } from 'react'
import { Hash, TrendingUp, Activity } from 'lucide-react'
import { simulateTradingProgress } from '@/lib/trading'
import { useCurrency } from '@/components/currency/CurrencyProvider'

interface TradingLiveOverviewCardsProps {
  planLabel: string
  statusLabel: string
  investmentUsd: number
  expectedReturnUsd: number
  durationHours: number
  startDateIso?: string | null
  seed: number
}

export default function TradingLiveOverviewCards({
  planLabel,
  statusLabel,
  investmentUsd,
  expectedReturnUsd,
  durationHours,
  startDateIso,
  seed,
}: TradingLiveOverviewCardsProps) {
  const { format } = useCurrency()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 5000)
    return () => clearInterval(interval)
  }, [])

  const startDate = useMemo(() => (startDateIso ? new Date(startDateIso) : new Date()), [startDateIso])

  const snapshot = simulateTradingProgress({
    investmentUsd,
    expectedReturnUsd,
    durationHours,
    startDate,
    now,
    seed,
  })

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div
        className="p-4 rounded-2xl min-w-0"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        <div className="text-xs text-white/60">Current Plan</div>
        <div className="text-lg font-semibold text-white mt-2">{planLabel}</div>
        <div className="text-xs text-white/50 mt-1">{statusLabel}</div>
      </div>
      <div
        className="p-4 rounded-2xl min-w-0"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
          <Hash size={16} />
          <span>Portfolio Equity</span>
        </div>
        <div className="text-xl font-bold text-white truncate" title={format(snapshot.equityUsd)}>
          {format(snapshot.equityUsd)}
        </div>
      </div>
      <div
        className="p-4 rounded-2xl min-w-0"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
          <TrendingUp size={16} />
          <span>Realized P/L</span>
        </div>
        <div className="text-xl font-bold text-white truncate" title={format(snapshot.pnlUsd)}>
          {format(snapshot.pnlUsd)}
        </div>
      </div>
      <div
        className="p-4 rounded-2xl min-w-0"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
          <Activity size={16} />
          <span>Open Positions</span>
        </div>
        <div className="text-xl font-bold text-white">{snapshot.openPositions}</div>
      </div>
    </div>
  )
}
