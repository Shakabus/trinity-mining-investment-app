import Link from 'next/link'
import BitryxHeader from '@/components/marketing/BitryxHeader'
import HeroLottie from '@/components/marketing/HeroLottie'
import RevenueCalculator from '@/components/marketing/RevenueCalculator'
import TradingViewWidget from '@/components/trading/TradingViewWidget'
import WalletLottie from '@/components/marketing/WalletLottie'

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

        <section className="mt-20 space-y-10 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">
            Transformative Method To Monetize Digital Assets
          </p>
          <h2 className="mx-auto max-w-4xl text-3xl font-semibold leading-tight md:text-5xl">
            Harness Trinity Collective Global Mining Farm Network
          </h2>

          <div className="infrastructure-container">
            <div className="infra-card">
              <div className="icon-container">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="2" y="2" width="20" height="20" rx="2" />
                  <line x1="7" y1="8" x2="17" y2="8" />
                  <line x1="7" y1="12" x2="17" y2="12" />
                  <line x1="7" y1="16" x2="17" y2="16" />
                  <circle cx="4.5" cy="8" r="0.5" fill="#ffffff" />
                  <circle cx="4.5" cy="12" r="0.5" fill="#ffffff" />
                  <circle cx="4.5" cy="16" r="0.5" fill="#ffffff" />
                </svg>
              </div>
              <div className="card-title">ASIC Miners</div>
              <div className="card-description">
                Purpose-built machines optimized for Bitcoin mining. High-performance chips deliver maximum hash power with exceptional energy efficiency.
              </div>
              <div className="card-stats">200+ TH/s per unit</div>
            </div>

            <div className="infra-card">
              <div className="icon-container">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="7" width="18" height="10" rx="2" />
                  <path d="M7 7V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v3" />
                  <line x1="7" y1="10" x2="7" y2="14" />
                  <line x1="10" y1="10" x2="10" y2="14" />
                  <line x1="14" y1="10" x2="14" y2="14" />
                  <line x1="17" y1="10" x2="17" y2="14" />
                  <line x1="9" y1="17" x2="9" y2="20" />
                  <line x1="15" y1="17" x2="15" y2="20" />
                </svg>
              </div>
              <div className="card-title">GPU Rigs</div>
              <div className="card-description">
                Versatile graphics card setups for altcoin mining. Multi-GPU configurations provide flexibility across various proof-of-work algorithms.
              </div>
              <div className="card-stats">Multi-GPU flexibility</div>
            </div>

            <div className="infra-card">
              <div className="icon-container">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                  <path d="M12 12h.01" />
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v10" />
                  <path d="M12 15v7" />
                </svg>
              </div>
              <div className="card-title">Infrastructure</div>
              <div className="card-description">
                Advanced cooling systems, reliable power distribution, and network pooling ensure optimal performance and uptime across the entire farm.
              </div>
              <div className="card-stats">24/7 uptime guarantee</div>
            </div>
          </div>
        </section>

        <section className="mt-20 space-y-6">
          <h2 className="text-3xl font-semibold">Watchlist</h2>
          <div
            className="w-full rounded-3xl p-4 md:p-6"
            style={{
              background:
                'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
            }}
          >
            <TradingViewWidget />
          </div>
        </section>

        <section className="mt-20 flex flex-col gap-10 lg:flex-row lg:items-center">
          <div className="w-full max-w-2xl space-y-6">
            <h2 className="text-3xl font-semibold leading-tight md:text-4xl">
              Embrace Trinity in One Strategy for Building a Strong Crypto
              Revenue Source via Efficient Cloud Hash Power
            </h2>
            <p className="text-sm text-white/70 md:text-base">
              Scale into mining with resilient infrastructure, enterprise-grade
              monitoring, and verified payout cycles. Trinity in One delivers
              performance-focused planning so you can grow without operational
              overhead.
            </p>
            <a href="#get-started" className="glass-button">
              Get Started
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
          </div>
          <div className="flex w-full items-center justify-center lg:justify-end">
            <WalletLottie />
          </div>
        </section>
      </main>
    </div>
  )
}
