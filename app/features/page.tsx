import Link from 'next/link'
import BitryxHeader from '@/components/marketing/BitryxHeader'
import MarketingFooter from '@/components/marketing/MarketingFooter'
import styles from '@/app/features/page.module.css'

const CORE_FEATURES = [
  {
    tag: 'Dashboard',
    title: 'Unified live command center',
    body: 'Track mining plans, investment cycles, order progress, and payout states from one consolidated interface with real-time status visibility.',
    delay: styles.delay1,
  },
  {
    tag: 'Mining',
    title: 'Managed hashrate infrastructure',
    body: 'Plan allocations map to active infrastructure capacity with uptime-oriented operations, monitoring controls, and transparent cycle tracking.',
    delay: styles.delay2,
  },
  {
    tag: 'Investment',
    title: 'Structured trading plan engine',
    body: 'Capital flows through duration-based plan tiers with defined multipliers, execution controls, and lifecycle reporting from activation to completion.',
    delay: styles.delay3,
  },
  {
    tag: 'Operations',
    title: 'Order and payout workflow visibility',
    body: 'Every step from proof submission and verification through approval, active execution, and payout processing is logged and surfaced clearly.',
    delay: styles.delay4,
  },
  {
    tag: 'Security',
    title: 'Risk and compliance controls',
    body: 'Layered identity checks, account risk flags, process auditing, and policy-based reviews protect platform integrity and user account safety.',
    delay: styles.delay5,
  },
  {
    tag: 'Support',
    title: 'Integrated support and legal pages',
    body: 'Built-in support ticket workflows plus dedicated legal and policy pages help users access practical guidance, privacy terms, and full platform context.',
    delay: styles.delay6,
  },
]

const EXPERIENCE_FEATURES = [
  {
    tag: 'Analytics',
    title: 'Performance-first reporting stack',
    body: 'Historical snapshots, current plan states, and cycle-level records make it easier to assess strategy decisions with evidence instead of guesswork.',
    delay: styles.delay3,
  },
  {
    tag: 'Automation',
    title: 'Operationally efficient plan flow',
    body: 'Systemized status transitions, approval logic, and payout sequencing reduce manual friction while keeping governance and traceability intact.',
    delay: styles.delay4,
  },
  {
    tag: 'Portfolio',
    title: 'Multi-product capital structure',
    body: 'Users can split exposure across mining and investment plans to balance steady infrastructure participation with cycle-based growth opportunities.',
    delay: styles.delay5,
  },
  {
    tag: 'Scalability',
    title: 'Built for progression by tier',
    body: 'Users can start with lower tiers, learn system behavior, then scale allocations based on completed cycle review and risk-adjusted planning.',
    delay: styles.delay6,
  },
]

const REAL_ESTATE_FEATURES = [
  {
    tag: 'Portfolio',
    title: 'Tier-based property participation',
    body: 'Users buy into selected assets through structured tiers, so each entry point maps clearly to a defined cycle, payout model, and performance band.',
    delay: styles.delay1,
  },
  {
    tag: 'Profitability',
    title: 'Income-focused payout architecture',
    body: 'Each property is configured around operating income behavior, with monthly realization tracking, cycle-level summaries, and clean view of realized vs projected flow.',
    delay: styles.delay2,
  },
  {
    tag: 'Control',
    title: 'Approval-gated scaling logic',
    body: 'Additional buy-ins and parallel property allocations can be expanded through controlled approvals to keep portfolio growth disciplined and auditable.',
    delay: styles.delay3,
  },
  {
    tag: 'Lifecycle',
    title: 'End-to-end property workflow',
    body: 'From buy-in request to approval, activation, earnings accrual, and withdrawal windows, every stage is surfaced in a single operational timeline.',
    delay: styles.delay4,
  },
]

const PRODUCT_COMPARISON = [
  {
    lane: 'Mining Plans',
    strength: 'Infrastructure-linked participation',
    metric: 'Hashrate tier + runtime cycle',
    bestFor: 'Steady operational exposure with transparent status flow',
  },
  {
    lane: 'Investment Trading Plans',
    strength: 'Structured cycle-based execution',
    metric: 'Capital tier + return multiplier',
    bestFor: 'Planned growth cycles with predefined completion windows',
  },
  {
    lane: 'Unified Dashboard Layer',
    strength: 'Cross-product visibility',
    metric: 'Order, activity, earnings, and payout tracking',
    bestFor: 'Managing both engines in one operating view',
  },
]

const STATS = [
  { value: '24/7', label: 'status visibility' },
  { value: '2-in-1', label: 'mining + trading flow' },
  { value: 'Multi-tier', label: 'scaling structure' },
  { value: 'End-to-end', label: 'order to payout records' },
]

export default function FeaturesPage() {
  return (
    <div className={`min-h-screen bg-black text-white marketing-page ${styles.page}`}>
      <div className={styles.glowA} />
      <div className={styles.glowB} />
      <div className="marketing-page-content">
        <div className={`mx-auto w-full max-w-6xl px-6 pt-6 ${styles.headerLayer}`}>
          <BitryxHeader />
        </div>

        <main className={`mx-auto w-full max-w-6xl px-6 pb-14 pt-28 ${styles.content}`}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Features</p>
          <h1 className={styles.title}>Trinity in One Platform Capabilities</h1>
          <p className={styles.subtitle}>
            Trinity in One combines mining infrastructure, structured investment trading cycles, and
            reporting intelligence into one controlled operating system. The platform is designed to
            keep execution clear, measurable, and scalable from entry-level plans to advanced
            allocation workflows.
          </p>
          <div className={styles.badgeRow}>
            <span className={styles.badge}>Mining Infrastructure</span>
            <span className={styles.badge}>Investment Plan Cycles</span>
            <span className={styles.badge}>Order &amp; Payout Visibility</span>
            <span className={styles.badge}>Integrated Risk Controls</span>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Core feature architecture</h2>
          <p className={styles.sectionText}>
            The platform is built as connected capability layers so users can understand performance,
            workflow status, and operational context without switching between disconnected systems.
          </p>
          <div className={styles.gridThree}>
            {CORE_FEATURES.map(feature => (
              <article key={feature.title} className={`${styles.featureCard} ${feature.delay}`}>
                <span className={styles.pill}>{feature.tag}</span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Operational experience features</h2>
          <p className={styles.sectionText}>
            Beyond product mechanics, Trinity in One emphasizes usability, monitoring clarity, and
            scalable workflow control across user-facing and operations-facing systems.
          </p>
          <div className={styles.gridTwo}>
            {EXPERIENCE_FEATURES.map(feature => (
              <article key={feature.title} className={`${styles.featureCard} ${feature.delay}`}>
                <span className={styles.pill}>{feature.tag}</span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Real Estate Portfolio features</h2>
          <p className={styles.sectionText}>
            The real estate lane is built to prioritize profitability through structured buy-in tiers,
            disciplined activation controls, and live earnings visibility. Instead of static listings,
            each property behaves as a managed income engine with clear cycle logic and measurable
            outcome tracking.
          </p>
          <div className={styles.gridTwo}>
            {REAL_ESTATE_FEATURES.map(feature => (
              <article key={feature.title} className={`${styles.featureCard} ${feature.delay}`}>
                <span className={styles.pill}>{feature.tag}</span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
          <div className={styles.realEstateStrip}>
            <article className={styles.realEstateMetric}>
              <p>Property-level cycle control</p>
              <span>Activation, accrual, payout windows</span>
            </article>
            <article className={styles.realEstateMetric}>
              <p>Profitability visibility</p>
              <span>Realized earnings and monthly run-rate view</span>
            </article>
            <article className={styles.realEstateMetric}>
              <p>Governed scaling</p>
              <span>Approval-led expansion across multiple assets</span>
            </article>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Product lanes at a glance</h2>
          <p className={styles.sectionText}>
            Each lane is distinct in behavior, but all are connected through one reporting and status
            system so users can manage capital with clearer structure.
          </p>
          <div className={styles.compareWrap}>
            <table className={styles.compareTable}>
              <thead>
                <tr>
                  <th>Lane</th>
                  <th>Primary Strength</th>
                  <th>Core Metric</th>
                  <th>Best Use Case</th>
                </tr>
              </thead>
              <tbody>
                {PRODUCT_COMPARISON.map(row => (
                  <tr key={row.lane}>
                    <td>{row.lane}</td>
                    <td>{row.strength}</td>
                    <td>{row.metric}</td>
                    <td>{row.bestFor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.statsRow}>
            {STATS.map(stat => (
              <article key={stat.label} className={styles.statCard}>
                <div className={styles.statValue}>{stat.value}</div>
                <div className={styles.statLabel}>{stat.label}</div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.cta}>
          <h2 className={styles.ctaTitle}>Explore the full system in motion</h2>
          <p className={styles.ctaText}>
            Use the How It Works flow to see step-by-step execution, then review Incentives and FAQ
            pages for rewards structure, risk context, and user guidance before choosing your next
            plan tier.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/how-it-works" className={styles.btnPrimary}>
              View How It Works
            </Link>
            <Link href="/incentives" className={styles.btnSecondary}>
              Review Incentives
            </Link>
            <Link href="/faq" className={styles.btnSecondary}>
              Open FAQ
            </Link>
          </div>
        </section>
        </main>
      </div>

      <MarketingFooter />
    </div>
  )
}
