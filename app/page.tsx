import Link from 'next/link'
import BitryxHeader from '@/components/marketing/BitryxHeader'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-6xl px-6 pt-6">
        <BitryxHeader />
      </div>

      <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-10">
        <section className="grid gap-10 lg:grid-cols-[1.15fr,0.85fr]">
          <div className="space-y-6">
            <p className="text-sm uppercase tracking-[0.35em] text-white/60">
              Managed Crypto & Multi-Asset Mining
            </p>
            <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
              Grow digital wealth with transparent, always-on infrastructure.
            </h1>
            <p className="max-w-2xl text-base text-white/70 md:text-lg">
              Bitryx blends verified mining performance with managed trading
              allocations so you can diversify between crypto, stocks, and real
              estate strategies without operational overhead.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                className="bitryx-login-btn"
                href="/sign-up"
                style={{ padding: '10px 26px' }}
              >
                Get Started
              </Link>
              <Link
                className="rounded-full border border-white/20 px-6 py-2 text-sm text-white/80 transition hover:border-white/40 hover:text-white"
                href="/how-it-works"
              >
                How it works
              </Link>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-white/60">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                24/7 monitoring & reporting
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                Multi-asset risk controls
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                Verified payout workflow
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                  Live Allocation
                </p>
                <p className="mt-3 text-3xl font-semibold">63% Crypto</p>
                <p className="text-sm text-white/60">
                  Adaptive portfolio mix with real-time risk rebalancing.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                  Mining Throughput
                </p>
                <p className="mt-3 text-3xl font-semibold">7.8 PH/s</p>
                <p className="text-sm text-white/60">
                  Dedicated capacity for verified BTC-only plans.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                  Weekly Yield
                </p>
                <p className="mt-3 text-3xl font-semibold">+12.4%</p>
                <p className="text-sm text-white/60">
                  Performance snapshots updated every 24 hours.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="mt-20 rounded-[32px] border border-white/10 bg-white/5 p-10 backdrop-blur-2xl"
        >
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <h3 className="text-lg font-semibold">Unified Dashboard</h3>
              <p className="mt-3 text-sm text-white/70">
                Track mining performance, trading portfolios, and withdrawals
                from a single command center.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Proof-first Payments</h3>
              <p className="mt-3 text-sm text-white/70">
                Submit payment receipts and verify approvals before any plan
                activates.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Global Currency Support</h3>
              <p className="mt-3 text-sm text-white/70">
                Display balances in your preferred currency while operations
                stay USD-based for accuracy.
              </p>
            </div>
          </div>
        </section>

        <section
          id="incentives"
          className="mt-16 grid gap-6 rounded-[32px] border border-white/10 bg-white/5 p-10 backdrop-blur-2xl md:grid-cols-[1.2fr,0.8fr]"
        >
          <div>
            <h2 className="text-2xl font-semibold">Incentives that scale</h2>
            <p className="mt-4 text-sm text-white/70">
              Unlock higher allocation weights and faster payout windows as your
              portfolio grows. Invite trusted partners to earn referral rewards
              and expand your managed exposure.
            </p>
            <Link
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white"
              href="/about-us"
            >
              Learn about our incentive tiers →
            </Link>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">
              Referral Rewards
            </p>
            <p className="mt-3 text-3xl font-semibold">Up to 8%</p>
            <p className="text-sm text-white/60">
              Applied to first verified payment from your invitees.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
