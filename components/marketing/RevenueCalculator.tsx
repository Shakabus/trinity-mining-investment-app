'use client'

import { useCallback, useMemo, useState } from 'react'

const DAILY_YIELD_PER_TH_BTC = 0.00000022
const TH_PER_PH = 1000
const MAX_OFFERED_HASHRATE_PH = 200

export default function RevenueCalculator() {
  const [hashrate, setHashrate] = useState('2.0')
  const [days, setDays] = useState('1')
  const [result, setResult] = useState<string | null>(null)

  // Keep calculator aligned with the same BTC yield model used in mining earnings logic.
  const btcPerPhPerDay = useMemo(
    () => DAILY_YIELD_PER_TH_BTC * TH_PER_PH,
    [],
  )

  const calculate = useCallback(() => {
    const hashrateValue = Number.parseFloat(hashrate)
    const daysValue = Number.parseInt(days, 10)

    if (!hashrateValue || hashrateValue <= 0 || !daysValue || daysValue <= 0) {
      setResult(null)
      return
    }

    const clampedHashrate = Math.min(hashrateValue, MAX_OFFERED_HASHRATE_PH)
    const revenue = clampedHashrate * btcPerPhPerDay * daysValue
    setResult(revenue.toFixed(8))
  }, [hashrate, days, btcPerPhPerDay])

  return (
    <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
      <div className="max-w-md">
        <h2 className="text-3xl font-semibold leading-tight md:text-4xl">
          How Much I
          <br />
          will Earn?
        </h2>
        <p className="mt-3 text-sm text-white/70">
          We currently support up to {MAX_OFFERED_HASHRATE_PH} PH/s in mining hashrate allocations.
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center gap-6 rounded-[24px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl lg:flex-row">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-2 text-xs font-medium uppercase tracking-[0.2em] text-white/70">
            Hashrate (PH/s)
            <input
              className="h-12 w-40 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
              inputMode="decimal"
              min="0"
              max={MAX_OFFERED_HASHRATE_PH}
              onChange={event => setHashrate(event.target.value)}
              placeholder="2.0"
              step="0.01"
              type="number"
              value={hashrate}
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-medium uppercase tracking-[0.2em] text-white/70">
            Days
            <input
              className="h-12 w-28 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
              inputMode="numeric"
              min="1"
              onChange={event => setDays(event.target.value)}
              placeholder="1"
              step="1"
              type="number"
              value={days}
              onKeyDown={event => {
                if (event.key === 'Enter') calculate()
              }}
            />
          </label>
          <button
            className="bitryx-login-btn h-12 px-8 text-sm font-semibold"
            onClick={calculate}
            type="button"
          >
            Calculate
          </button>
        </div>

        <div className="min-w-[200px] text-center lg:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
            Estimated revenue for selected duration
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {result ? (
              <>
                {result} <span className="text-lg text-white/80">BTC</span>
              </>
            ) : (
              '--'
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
