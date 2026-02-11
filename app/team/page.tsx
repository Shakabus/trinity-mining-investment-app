import Link from 'next/link'
import BitryxHeader from '@/components/marketing/BitryxHeader'
import MarketingFooter from '@/components/marketing/MarketingFooter'

const TEAM_PODS = [
  {
    name: 'Mining Infrastructure Operations',
    summary:
      'Runs fleet uptime, capacity balancing, power routing, and monitoring controls across active mining infrastructure.',
  },
  {
    name: 'Trading Strategy & Execution',
    summary:
      'Executes structured investment plans with rule-based workflows, cycle governance, and capital discipline.',
  },
  {
    name: 'Risk, Compliance & Security',
    summary:
      'Applies account controls, policy checks, escalation paths, and security oversight across platform operations.',
  },
  {
    name: 'Product & Engineering',
    summary:
      'Builds dashboard systems, activity tracking, payout flows, and reliability upgrades for user and admin tools.',
  },
  {
    name: 'Client Success & Support',
    summary:
      'Handles onboarding, issue resolution, payment guidance, and user communication with service-level accountability.',
  },
  {
    name: 'Real Estate Asset Management',
    summary:
      'Coordinates property onboarding, asset reporting, operating performance, and income distribution workflows.',
  },
]

const WORKFLOW = [
  {
    step: '01',
    title: 'Cross-desk planning',
    text: 'Mining, trading, and asset teams align on cycle priorities before execution windows open.',
  },
  {
    step: '02',
    title: 'System-led execution',
    text: 'Actions are pushed through structured workflows so each state change is logged and auditable.',
  },
  {
    step: '03',
    title: 'Continuous monitoring',
    text: 'Ops and risk teams track live signals, escalate exceptions, and enforce platform controls.',
  },
  {
    step: '04',
    title: 'Review and optimization',
    text: 'Completed cycles are reviewed for performance quality and used to improve the next run.',
  },
]

export default function TeamPage() {
  return (
    <div className="min-h-screen bg-black text-white marketing-page">
      <div className="marketing-page-content">
        <div className="mx-auto w-full max-w-6xl px-6 pt-6">
          <BitryxHeader />
        </div>

        <main className="mx-auto w-full max-w-6xl px-6 pb-14 pt-28">
          <section className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/10 via-white/5 to-white/[0.02] p-6 md:p-10">
            <p className="text-xs uppercase tracking-[0.22em] text-white/60">Team</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight md:text-6xl">People Behind Trinity in One</h1>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-white/80 md:text-base">
              Trinity in One is built by specialized teams across infrastructure, trading, product,
              compliance, and asset management. We operate as one coordinated system focused on
              execution quality, transparency, and sustainable performance.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs uppercase tracking-wide text-white/80">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">Multi-desk operations</span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">Execution accountability</span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">Global coordination</span>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-semibold md:text-3xl">Operating teams</h2>
            <p className="mt-3 max-w-4xl text-white/75">
              Each function is purpose-built, but all teams work from the same data and status system
              so users experience consistent execution from order to payout.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {TEAM_PODS.map(pod => (
                <article key={pod.name} className="rounded-2xl border border-white/15 bg-white/5 p-5">
                  <h3 className="text-lg font-semibold">{pod.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/75">{pod.summary}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-semibold md:text-3xl">How the team executes</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {WORKFLOW.map(item => (
                <article key={item.step} className="rounded-2xl border border-white/15 bg-white/[0.03] p-5">
                  <div className="text-xs uppercase tracking-[0.16em] text-white/60">{item.step}</div>
                  <h3 className="mt-2 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/75">{item.text}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-10 rounded-3xl border border-white/15 bg-gradient-to-r from-white/10 to-white/[0.03] p-6 md:p-8">
            <h2 className="text-2xl font-semibold">Talk with our team</h2>
            <p className="mt-3 max-w-3xl text-white/75">
              For onboarding, plan guidance, support, or partnership requests, contact our operations
              team directly.
            </p>
            <Link
              href="/contact"
              className="mt-5 inline-flex rounded-full border border-white/20 bg-white/15 px-5 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5"
            >
              Contact Team
            </Link>
          </section>
        </main>
      </div>

      <MarketingFooter />
    </div>
  )
}
