import Link from 'next/link'
import BitryxHeader from '@/components/marketing/BitryxHeader'
import HeroLottie from '@/components/marketing/HeroLottie'
import RevenueCalculator from '@/components/marketing/RevenueCalculator'
import TradingViewWidget from '@/components/trading/TradingViewWidget'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-6xl px-6 pt-6">
        <BitryxHeader />
      </div>

      <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-28">
        <section className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-white/70">
            A Stable Mining Platform
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-6xl">
            To Maximize Profitability
          </h1>
          <p className="mt-4 text-sm text-white/70 md:text-base">
            Join the revolution in cloud-based mining with high yields and zero
            hardware hassle. Mine crypto effortlessly with Trinity In One- power
            your future today
          </p>
        </section>

        <div className="mt-10">
          <HeroLottie />
        </div>

        <section className="mt-20">
          <RevenueCalculator />
        </section>

        <section className="relative mt-20 overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-10 backdrop-blur-2xl">
          <div className="pointer-events-none absolute -left-32 top-10 h-64 w-64 rounded-full bg-cyan-400/20 blur-[120px]" />
          <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-indigo-500/30 blur-[140px]" />

          <div className="relative z-10 grid gap-10 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                Investment Trading
              </p>
              <h2 className="text-3xl font-semibold leading-tight md:text-4xl">
                Actively managed portfolios that scale with market momentum.
              </h2>
              <p className="text-sm text-white/70 md:text-base">
                Our trading desks blend crypto, equities, and real estate signals
                into a single managed portfolio. You get disciplined allocation
                shifts, risk-adjusted exposure, and transparent performance
                tracking—without daily micromanagement.
              </p>
              <div className="flex flex-wrap gap-4 text-xs text-white/70">
                <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur">
                  Real-time allocation shifts
                </span>
                <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur">
                  Multi-asset risk controls
                </span>
                <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur">
                  Verified payout cadence
                </span>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="glass-panel animate-float-slow">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                  Strategy Pulse
                </p>
                <p className="mt-3 text-2xl font-semibold">Adaptive Alpha</p>
                <p className="mt-2 text-sm text-white/60">
                  Momentum-led rotation between crypto and equities when market
                  volatility rises.
                </p>
              </div>
              <div className="glass-panel animate-float-medium">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                  Risk Layer
                </p>
                <p className="mt-3 text-2xl font-semibold">Capital Shield</p>
                <p className="mt-2 text-sm text-white/60">
                  Automated drawdown controls and daily allocation tuning.
                </p>
              </div>
              <div className="glass-panel animate-float-fast">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                  Portfolio Focus
                </p>
                <p className="mt-3 text-2xl font-semibold">Growth Mix</p>
                <p className="mt-2 text-sm text-white/60">
                  Balanced exposure to high-yield crypto and stable assets.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-20 space-y-6">
          <h2 className="text-3xl font-semibold">Watchlist</h2>
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
            <div className="h-[520px] md:h-[620px]">
              <TradingViewWidget />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
