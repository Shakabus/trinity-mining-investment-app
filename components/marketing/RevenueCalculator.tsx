'use client'

import { useCallback, useMemo, useState } from 'react'

const NETWORK_HASHRATE = 750000
const DAILY_BTC = 450

export default function RevenueCalculator() {
  const [hashrate, setHashrate] = useState('1.0')
  const [days, setDays] = useState('1')
  const [result, setResult] = useState<string | null>(null)

  const btcPerPhPerDay = useMemo(() => DAILY_BTC / NETWORK_HASHRATE, [])

  const calculate = useCallback(() => {
    const hashrateValue = Number.parseFloat(hashrate)
    const daysValue = Number.parseInt(days, 10)

    if (!hashrateValue || hashrateValue <= 0 || !daysValue || daysValue <= 0) {
      setResult(null)
      return
    }

    const revenue = hashrateValue * btcPerPhPerDay * daysValue
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
          We offer up to 1PH/s in mining hashrates.
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
              onChange={event => setHashrate(event.target.value)}
              placeholder="1.0"
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
            Estimated 24 hour revenue
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {result ? (
              <>
                {result} <span className="text-lg text-white/80">BTC</span>
              </>
            ) : (
              '—'
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
