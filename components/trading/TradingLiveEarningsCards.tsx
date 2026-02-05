'use client'

import { useEffect, useMemo, useState } from 'react'
import { DollarSign, TrendingUp, Activity } from 'lucide-react'
import { simulateTradingProgress } from '@/lib/trading'
import { useCurrency } from '@/components/currency/CurrencyProvider'

interface TradingLiveEarningsCardsProps {
  investmentUsd: number
  expectedReturnUsd: number
  durationHours: number
  startDateIso?: string | null
  seed: number
}

export default function TradingLiveEarningsCards({
  investmentUsd,
  expectedReturnUsd,
  durationHours,
  startDateIso,
  seed,
}: TradingLiveEarningsCardsProps) {
  const { format } = useCurrency()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 15000)
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div
        className="p-4 rounded-2xl min-w-0"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
          <DollarSign size={16} />
          <span>Total Earned</span>
        </div>
        <div className="text-xl font-bold text-white truncate" title={format(snapshot.earnedUsd)}>
          {format(snapshot.earnedUsd)}
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
          <span>Daily Estimate</span>
        </div>
        <div className="text-xl font-bold text-white truncate" title={format(snapshot.dailyEstimateUsd)}>
          {format(snapshot.dailyEstimateUsd)}
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
          <span>Expected Return</span>
        </div>
        <div className="text-xl font-bold text-white truncate" title={format(expectedReturnUsd)}>
          {format(expectedReturnUsd)}
        </div>
      </div>
    </div>
  )
}
