import Link from 'next/link'
import BitryxHeader from '@/components/marketing/BitryxHeader'
import MarketingFooter from '@/components/marketing/MarketingFooter'
import styles from '@/app/incentives/page.module.css'

const INCENTIVE_ENGINES = [
  {
    tag: 'Network-Based',
    title: 'Mining payout incentives',
    body: 'Mining payouts are tied to active infrastructure participation. Reward outcomes reflect hashrate allocation, cycle runtime, network difficulty, and operational consistency rather than fixed promises.',
    delay: styles.delay1,
  },
  {
    tag: 'Consistency',
    title: 'Loyalty progression benefits',
    body: 'Accounts with consistent cycle participation can unlock reduced operational friction, faster handling lanes, and earlier access to higher-capacity windows where policy conditions are met.',
    delay: styles.delay2,
  },
  {
    tag: 'Growth',
    title: 'Referral incentive credits',
    body: 'Referral credits activate when invited users complete qualifying actions. The system is traceable, capped, and designed to reward real platform expansion rather than artificial sign-up activity.',
    delay: styles.delay3,
  },
  {
    tag: 'Reinvestment',
    title: 'Cycle-to-cycle compounding',
    body: 'Users who review completed cycles and redeploy with discipline can improve continuity. Structured reinvestment logic helps align incentives with long-term portfolio planning.',
    delay: styles.delay4,
  },
  {
    tag: 'Portfolio',
    title: 'Dual-engine incentive structure',
    body: 'Mining and investment plans can run in parallel, creating mixed incentive behavior: infrastructure-linked payout dynamics plus cycle-based strategy returns in one account environment.',
    delay: styles.delay5,
  },
  {
    tag: 'Governance',
    title: 'Transparent status accountability',
    body: 'Every incentive-relevant event moves through visible order, cycle, and payout states. This keeps expectations realistic and makes reward progression auditable from the dashboard.',
    delay: styles.delay6,
  },
]

const STRATEGY_STEPS = [
  {
    step: '01',
    title: 'Start with a clear split',
    text: 'Allocate capital between mining and trading based on your risk profile, not hype. Keep enough flexibility for adjustments after the first completed cycle.',
  },
  {
    step: '02',
    title: 'Track cycle quality, not noise',
    text: 'Review cycle-level outcomes and status accuracy. Incentive quality improves when decisions are based on completed cycle data instead of short-term fluctuations.',
  },
  {
    step: '03',
    title: 'Use loyalty windows intentionally',
    text: 'Consistency can unlock better handling and timing advantages. Plan participation continuity is often more valuable than random tier switching.',
  },
  {
    step: '04',
    title: 'Scale referrals with quality',
    text: 'Referral rewards are strongest when invited users actually activate and complete qualifying flows. Focus on genuine onboarding, not volume without conversion.',
  },
  {
    step: '05',
    title: 'Rebalance after completion',
    text: 'After each cycle, reassess mining exposure, trading tier, payout needs, and reinvestment targets. This is where long-term incentive optimization happens.',
  },
]

const TIER_MATRIX = [
  {
    tier: 'Entry',
    qualification: 'Initial active cycle with verified funding',
    incentives: 'Base payout visibility and standard queue processing',
    bestFor: 'Learning platform behavior safely',
  },
  {
    tier: 'Active',
    qualification: 'Consistent cycle participation across products',
    incentives: 'Improved operational handling and structured loyalty eligibility',
    bestFor: 'Users building repeatable allocation discipline',
  },
  {
    tier: 'Growth',
    qualification: 'Cycle continuity + controlled scaling',
    incentives: 'Broader tier access and stronger reinvestment optionality',
    bestFor: 'Users balancing expansion with risk control',
  },
  {
    tier: 'Strategic',
    qualification: 'Sustained account quality and governance alignment',
    incentives: 'Priority pathways and deeper portfolio coordination support',
    bestFor: 'High-structure users managing multi-lane capital',
  },
]

const DISCLOSURE_POINTS = [
  'Incentives are performance-dependent and vary with network and market conditions.',
  'Referral rewards require qualifying actions and can be capped by policy.',
  'Loyalty and priority benefits are conditional and not guaranteed permanent rights.',
  'Historical cycle outcomes should be used for planning, not treated as fixed forecasts.',
]

export default function IncentivesPage() {
  return (
    <div className={`min-h-screen bg-black text-white ${styles.page}`}>
      <div className={styles.glowA} />
      <div className={styles.glowB} />
      <div className={styles.glowC} />

      <div className={`mx-auto w-full max-w-6xl px-6 pt-6 ${styles.headerLayer}`}>
        <BitryxHeader />
      </div>

      <main className={`mx-auto w-full max-w-6xl px-6 pb-14 pt-28 ${styles.content}`}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Incentives</p>
          <h1 className={styles.title}>Rewards Designed For Real Participation</h1>
          <p className={styles.subtitle}>
            Trinity in One incentives are tied to measurable account activity across mining and
            structured investment cycles. Instead of relying on vague reward language, the system uses
            observable status flow, policy-bound triggers, and cycle completion logic so users can plan
            with clarity.
          </p>
          <div className={styles.badgeRow}>
            <span className={styles.badge}>Mining Payout Incentives</span>
            <span className={styles.badge}>Loyalty Progression</span>
            <span className={styles.badge}>Referral Credits</span>
            <span className={styles.badge}>Reinvestment Strategy</span>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Incentive engine overview</h2>
          <p className={styles.sectionText}>
            Each incentive lane is connected to real user behavior, plan participation quality, and
            operational compliance. This keeps rewards aligned with sustainable platform activity.
          </p>
          <div className={styles.gridThree}>
            {INCENTIVE_ENGINES.map(item => (
              <article key={item.title} className={`${styles.card} ${item.delay}`}>
                <span className={styles.pill}>{item.tag}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>How to optimize incentives responsibly</h2>
          <p className={styles.sectionText}>
            Incentive quality improves when users follow a structured process. This flow is designed to
            help users avoid random behavior and focus on compounding outcomes over completed cycles.
          </p>
          <div className={styles.flowWrap}>
            {STRATEGY_STEPS.map(item => (
              <article key={item.step} className={styles.flowStep}>
                <div className={styles.flowNum}>{item.step}</div>
                <div>
                  <h3 className={styles.flowTitle}>{item.title}</h3>
                  <p className={styles.flowText}>{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Incentive maturity tiers</h2>
          <p className={styles.sectionText}>
            These maturity tiers show how reward quality typically evolves as users move from basic
            participation to structured multi-cycle management.
          </p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Tier</th>
                  <th>Qualification Pattern</th>
                  <th>Incentive Profile</th>
                  <th>Best Fit</th>
                </tr>
              </thead>
              <tbody>
                {TIER_MATRIX.map(row => (
                  <tr key={row.tier}>
                    <td>{row.tier}</td>
                    <td>{row.qualification}</td>
                    <td>{row.incentives}</td>
                    <td>{row.bestFor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.points}>
            <h3 className={styles.pointsTitle}>Important reward reality checks</h3>
            <ul>
              {DISCLOSURE_POINTS.map(point => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
          <p className={styles.disclosure}>
            Trinity in One incentives are structured to reward participation quality, not excessive
            speculation. Users should review platform terms, product risk, and cycle history before
            increasing allocation size.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Practical incentive knowledge</h2>
          <div className={styles.gridTwo}>
            <article className={`${styles.card} ${styles.delay7}`}>
              <span className={styles.pill}>Referral Quality</span>
              <h3>High-value referral behavior</h3>
              <p>
                Incentive quality usually comes from guided onboarding, accurate expectations, and
                verified activation, not from high link sharing volume without qualified account action.
              </p>
            </article>
            <article className={`${styles.card} ${styles.delay8}`}>
              <span className={styles.pill}>Cycle Planning</span>
              <h3>When to withdraw vs reinvest</h3>
              <p>
                Users often split outcomes into liquidity and redeployment buckets. This keeps
                incentives useful for growth while still preserving flexibility for personal cash flow.
              </p>
            </article>
          </div>
        </section>

        <section className={styles.cta}>
          <h2 className={styles.ctaTitle}>Build your incentive plan with full context</h2>
          <p className={styles.ctaText}>
            Start with How It Works to understand execution flow, then combine Features and FAQ to map
            your own approach before scaling into higher-capacity tiers.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/how-it-works" className={styles.btnPrimary}>
              View How It Works
            </Link>
            <Link href="/features" className={styles.btnSecondary}>
              Explore Features
            </Link>
            <Link href="/faq" className={styles.btnSecondary}>
              Read FAQ
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  )
}
