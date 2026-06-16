'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import BitryxHeader from '@/components/marketing/BitryxHeader'
import MarketingFooter from '@/components/marketing/MarketingFooter'

type FaqItem = {
  id: string
  category: string
  question: string
  answer: string
}

const CATEGORIES = [
  'All',
  'Getting Started',
  'Mining',
  'Investment Trading',
  'Real Estate Portfolio',
  'Payments & Withdrawals',
  'Security & Compliance',
  'Platform & Support',
] as const

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'gs-1',
    category: 'Getting Started',
    question: 'What is Trinity in One?',
    answer:
      'Trinity in One is a unified platform that combines cloud mining plans, structured investment trading plans, and portfolio reporting in one dashboard. The goal is to give users a clear operational flow from funding to cycle completion and payout visibility.',
  },
  {
    id: 'gs-2',
    category: 'Getting Started',
    question: 'Who is this platform designed for?',
    answer:
      'The platform supports both new and experienced users who want managed exposure to mining and investment cycles without handling infrastructure operations on their own.',
  },
  {
    id: 'gs-3',
    category: 'Getting Started',
    question: 'How do I create an account and start?',
    answer:
      'Use the sign up page, verify required details, then choose the product flow you want to activate first. You can begin with mining, investment trading, or run both in parallel based on your risk and capital plan.',
  },
  {
    id: 'gs-4',
    category: 'Getting Started',
    question: 'Can I use mining and investment trading at the same time?',
    answer:
      'Yes. Trinity in One supports concurrent plan activity. Each plan keeps its own order status, cycle timing, and payout records while still being managed from one account.',
  },
  {
    id: 'gs-5',
    category: 'Getting Started',
    question: 'What is the best first step for new users?',
    answer:
      'Start with a smaller plan to understand cycle timing, dashboard reporting, and payout flow. After one full cycle, review performance and then scale allocation with a structured approach.',
  },
  {
    id: 'min-1',
    category: 'Mining',
    question: 'How does Trinity in One mining work?',
    answer:
      'When a mining plan is activated, your allocation maps to managed hashrate capacity. Performance is monitored continuously and reflected in dashboard records, cycle status, and payout updates.',
  },
  {
    id: 'min-2',
    category: 'Mining',
    question: 'Do I need physical mining hardware?',
    answer:
      'No. Trinity in One operates the infrastructure layer, including provisioning, monitoring, maintenance, and operational controls. Users manage plan activity through the dashboard.',
  },
  {
    id: 'min-3',
    category: 'Mining',
    question: 'Why can mining earnings change over time?',
    answer:
      'Mining results are influenced by network difficulty, block reward economics, fee environment, uptime events, and market conditions. Stable hashrate does not guarantee identical daily outcomes.',
  },
  {
    id: 'min-4',
    category: 'Mining',
    question: 'How is hashrate assigned to my account?',
    answer:
      'Hashrate assignment follows your selected plan tier and active cycle state. Allocation data appears in your account flow so you can track activation, runtime, and cycle completion.',
  },
  {
    id: 'min-5',
    category: 'Mining',
    question: 'Can I upgrade my mining plan during an active cycle?',
    answer:
      'Upgrades are usually handled by activating a new eligible tier or moving at cycle boundaries according to plan logic. The dashboard will show available upgrade actions where supported.',
  },
  {
    id: 'trade-1',
    category: 'Investment Trading',
    question: 'What are structured investment trading plans?',
    answer:
      'Structured plans are cycle based investment products with defined capital levels, duration windows, and return multipliers. They run through controlled strategy execution rather than manual user trading.',
  },
  {
    id: 'trade-2',
    category: 'Investment Trading',
    question: 'Are investment returns guaranteed?',
    answer:
      'No. All returns are performance dependent. Trinity in One provides structured execution and reporting, but outcomes can vary with market conditions, liquidity, and risk controls.',
  },
  {
    id: 'trade-3',
    category: 'Investment Trading',
    question: 'What assets are represented in investment strategy exposure?',
    answer:
      'Depending on plan structure, strategy exposure may include crypto market positions, broader market instruments, and property linked allocation themes used inside the platform execution model.',
  },
  {
    id: 'trade-4',
    category: 'Investment Trading',
    question: 'How do I interpret return multipliers?',
    answer:
      'A multiplier describes how the cycle payout model is defined for that plan tier. Always evaluate multiplier, duration, and risk profile together rather than using multiplier alone as a decision metric.',
  },
  {
    id: 'trade-5',
    category: 'Investment Trading',
    question: 'What is a good way to combine mining and trading plans?',
    answer:
      'Many users keep mining as a steady infrastructure allocation and use trading plans for cycle based growth. Rebalancing after completed cycles helps maintain better control of risk and liquidity.',
  },
  {
    id: 're-1',
    category: 'Real Estate Portfolio',
    question: 'How does the real estate buy-in process work?',
    answer:
      'Choose a property, select a tier, and submit the request from your funded account balance. After review and approval, the position becomes active and starts tracking monthly earnings metrics in your property earnings view.',
  },
  {
    id: 're-2',
    category: 'Real Estate Portfolio',
    question: 'Can I hold multiple real estate positions at the same time?',
    answer:
      'Yes, but additional positions follow approval logic. Your first position must be approved and active before scaling into more properties or additional tiers for the same property.',
  },
  {
    id: 're-3',
    category: 'Real Estate Portfolio',
    question: 'What do realized earnings and monthly run rate mean?',
    answer:
      'Realized earnings shows accrued income already recognized in your active positions. Monthly run rate is a current monthly projection based on your live approved allocations and active tier structure.',
  },
  {
    id: 're-4',
    category: 'Real Estate Portfolio',
    question: 'When do real estate withdrawals become available?',
    answer:
      'Real estate withdrawal windows open after six months of active cycle time. Once eligible, one withdrawal request is allowed every six months based on available eligible balance and compliance state.',
  },
  {
    id: 're-5',
    category: 'Real Estate Portfolio',
    question: 'Why is my property earnings page showing projected and realized values separately?',
    answer:
      'Projected values are model-based estimates from your active tier and cycle settings, while realized values reflect actual accrued results. Keeping both visible helps you compare expected and live performance behavior.',
  },
  {
    id: 're-6',
    category: 'Real Estate Portfolio',
    question: 'Can property terms change after I already bought in?',
    answer:
      'Core cycle records for approved positions remain tied to your confirmed purchase context. New properties, edits, or removals in listings affect future selections, while your active records stay auditable.',
  },
  {
    id: 're-7',
    category: 'Real Estate Portfolio',
    question: 'How do approvals and rejections appear in my account?',
    answer:
      'Approval and rejection outcomes are posted to your real estate activity flow and reflected in dashboard status markers, so you can see whether a request is pending, approved, or rejected without contacting support first.',
  },
  {
    id: 're-8',
    category: 'Real Estate Portfolio',
    question: 'What is the best way to scale real estate exposure responsibly?',
    answer:
      'Start with one approved tier, monitor at least one reporting cycle, then add positions progressively. This gives better control over liquidity, timing, and withdrawal planning versus over-allocating too early.',
  },
  {
    id: 'pay-1',
    category: 'Payments & Withdrawals',
    question: 'How are plan payments confirmed?',
    answer:
      'Payments move through account-balance review and confirmation before plan activation. You can track pending, approved, and rejected states in account history and dashboard activity.',
  },
  {
    id: 'pay-2',
    category: 'Payments & Withdrawals',
    question: 'When can I request a withdrawal?',
    answer:
      'Withdrawal eligibility depends on available balance status, cycle completion rules, and account compliance state. Eligible balances appear in your payout view.',
  },
  {
    id: 'pay-3',
    category: 'Payments & Withdrawals',
    question: 'Why can payout processing take longer sometimes?',
    answer:
      'Processing times can vary due to network congestion, compliance review, wallet maintenance windows, and queue volume. Status updates are reflected in your withdrawal history.',
  },
  {
    id: 'pay-4',
    category: 'Payments & Withdrawals',
    question: 'Can I cancel a pending payout request?',
    answer:
      'If a request is still in a pending state, cancellation may be possible based on workflow stage. Check the withdrawal panel for available actions on that specific request.',
  },
  {
    id: 'pay-5',
    category: 'Payments & Withdrawals',
    question: 'What should I check before making a deposit or withdrawal?',
    answer:
      'Always verify wallet addresses, supported networks, memo or tag requirements, and amount accuracy. Incorrect transfer details can create delays or unrecoverable transfer issues.',
  },
  {
    id: 'sec-1',
    category: 'Security & Compliance',
    question: 'How does Trinity in One protect user accounts?',
    answer:
      'Security controls include encrypted transport, controlled access layers, monitoring, operational audit paths, and account review logic designed to detect suspicious patterns early.',
  },
  {
    id: 'sec-2',
    category: 'Security & Compliance',
    question: 'Does the platform perform verification checks?',
    answer:
      'Yes. Depending on use case and jurisdiction, identity verification and compliance checks may be required to satisfy legal, operational, and risk management obligations.',
  },
  {
    id: 'sec-3',
    category: 'Security & Compliance',
    question: 'What happens if unusual account activity is detected?',
    answer:
      'The system may apply protective measures such as temporary restrictions, additional verification prompts, or manual review while the activity is investigated.',
  },
  {
    id: 'sec-4',
    category: 'Security & Compliance',
    question: 'How is user data handled?',
    answer:
      'Data handling follows policy driven controls for service delivery, security, compliance, and support operations. Review the Privacy Policy and Terms pages for full legal details.',
  },
  {
    id: 'sec-5',
    category: 'Security & Compliance',
    question: 'Can access be limited for compliance reasons?',
    answer:
      'Yes. Trinity in One may restrict or suspend certain actions where required by legal obligations, sanctions screening, fraud prevention, or unresolved verification requirements.',
  },
  {
    id: 'sup-1',
    category: 'Platform & Support',
    question: 'Where do I track everything in one place?',
    answer:
      'Use the dashboard to monitor order states, plan activity, cycle progress, payout timelines, and account notifications across mining and investment products.',
  },
  {
    id: 'sup-2',
    category: 'Platform & Support',
    question: 'How do I contact support?',
    answer:
      'You can use the support section in your account or the contact page. Include your account email and the exact issue details so the team can respond faster.',
  },
  {
    id: 'sup-3',
    category: 'Platform & Support',
    question: 'What details should I include when opening a ticket?',
    answer:
      'Include plan type, order ID if available, date and time, error description, screenshots or references, and the exact action you were attempting.',
  },
  {
    id: 'sup-4',
    category: 'Platform & Support',
    question: 'How can I understand whether my strategy is working?',
    answer:
      'Compare cycle outcomes against your original plan assumptions, then review duration choices, capital split, and risk balance between mining and trading. Consistent review leads to better long term decisions.',
  },
  {
    id: 'sup-5',
    category: 'Platform & Support',
    question: 'Where can I learn the platform flow in order?',
    answer:
      'Visit the How It Works page for step by step operational flow, investment and mining framework sections, and process FAQs built around real platform lifecycle stages.',
  },
]

const KNOWLEDGE_PANELS = [
  {
    title: 'How To Read Your Dashboard',
    text: 'Use status flow first, not emotion. Start with order state, then cycle state, then payout state. This order gives the clearest view of what is happening and what action is required.',
  },
  {
    title: 'Capital Allocation Mindset',
    text: 'Treat mining and investment as two engines with different behavior. Mining is infrastructure linked and continuous, while investment plans are cycle based and strategy linked. Balance both intentionally.',
  },
  {
    title: 'Risk Management Basics',
    text: 'Do not over concentrate in one tier. Scale progressively, review each completed cycle, and keep a reserve for flexibility. Good structure usually beats aggressive sizing over time.',
  },
  {
    title: 'When To Reach Support',
    text: 'Contact support when a status appears stalled, account-balance reviews are pending too long, or payout records show mismatch with your expected cycle state. Provide full context in one message.',
  },
]

const GLOSSARY = [
  { term: 'Hashrate', meaning: 'The computational power allocated to mining operations.' },
  { term: 'Cycle', meaning: 'The defined time window in which a plan runs to completion.' },
  { term: 'Multiplier', meaning: 'The structured return factor assigned to a trading plan tier.' },
  { term: 'Order Status', meaning: 'The operational stage of a purchase or activation flow.' },
  { term: 'Payout Status', meaning: 'The processing stage for eligible withdrawal amounts.' },
  { term: 'Rebalance', meaning: 'Adjusting allocation between mining and trading after reviews.' },
]

function normalize(text: string) {
  return text.toLowerCase()
}

export default function FaqPage() {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All')
  const [query, setQuery] = useState('')
  const [openIds, setOpenIds] = useState<string[]>([])

  const filteredFaqs = useMemo(() => {
    const base = category === 'All' ? FAQ_ITEMS : FAQ_ITEMS.filter(item => item.category === category)
    const q = normalize(query.trim())
    if (!q) return base

    return base.filter(item => {
      return normalize(item.question).includes(q) || normalize(item.answer).includes(q)
    })
  }, [category, query])

  const groupedFaqs = useMemo(() => {
    return filteredFaqs.reduce<Record<string, FaqItem[]>>((acc, item) => {
      if (!acc[item.category]) acc[item.category] = []
      acc[item.category].push(item)
      return acc
    }, {})
  }, [filteredFaqs])

  const toggleOpen = (id: string) => {
    setOpenIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]))
  }

  return (
    <div className="min-h-screen bg-black text-white marketing-page">
      <div className="marketing-page-content">
        <div className="mx-auto w-full max-w-6xl px-6 pt-6">
          <BitryxHeader />
        </div>

        <main className="mx-auto w-full max-w-6xl px-6 pb-14 pt-28">
        <section className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.11] to-white/[0.03] p-7 shadow-[0_12px_40px_rgba(0,0,0,0.45)] md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">Help Center</p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight md:text-5xl">
            Frequently Asked Questions
          </h1>
          <p className="mt-4 max-w-4xl font-['Inter'] text-sm leading-7 text-white/80 md:text-base">
            This page brings together platform fundamentals, product specific guidance, and practical
            operating insights across Trinity in One mining, investment trading, and account workflows.
            Use the filters below to find fast answers, then review the strategy notes and glossary for
            deeper context.
          </p>
        </section>

        <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {KNOWLEDGE_PANELS.map(panel => (
            <article
              key={panel.title}
              className="rounded-2xl border border-white/12 bg-gradient-to-br from-white/[0.1] to-white/[0.02] p-5 shadow-[0_8px_28px_rgba(0,0,0,0.35)]"
            >
              <h2 className="text-lg font-semibold text-white">{panel.title}</h2>
              <p className="mt-2 font-['Inter'] text-sm leading-6 text-white/78">{panel.text}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border border-white/12 bg-white/[0.03] p-4 md:p-5">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(item => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className="rounded-full border px-4 py-2 text-sm font-medium transition"
                style={{
                  borderColor: category === item ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.16)',
                  background:
                    category === item
                      ? 'linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.08))'
                      : 'rgba(255,255,255,0.03)',
                }}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="mt-3">
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search question or keyword..."
              className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/45 focus:border-white/40 focus:outline-none"
            />
          </div>
          <p className="mt-2 text-xs text-white/55">
            Showing {filteredFaqs.length} result{filteredFaqs.length === 1 ? '' : 's'}
          </p>
        </section>

        <section className="mt-6 space-y-6">
          {Object.entries(groupedFaqs).map(([group, items]) => (
            <div key={group} className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">{group}</h2>
              {items.map(item => {
                const isOpen = openIds.includes(item.id)
                return (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-white/14 bg-gradient-to-br from-white/[0.1] to-white/[0.02] shadow-[0_8px_28px_rgba(0,0,0,0.35)]"
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                      onClick={() => toggleOpen(item.id)}
                      aria-expanded={isOpen}
                      aria-controls={`faq-${item.id}`}
                    >
                      <span className="text-base font-semibold text-white md:text-lg">{item.question}</span>
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                        aria-hidden="true"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </button>
                    <div
                      id={`faq-${item.id}`}
                      className={`grid transition-all duration-300 ${
                        isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <p className="px-5 pb-5 font-['Inter'] text-sm leading-7 text-white/82 md:text-base">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          ))}

          {filteredFaqs.length === 0 && (
            <div className="rounded-2xl border border-white/12 bg-white/[0.03] p-6 text-center">
              <p className="text-white/75">
                No matches found. Try a different keyword or switch category.
              </p>
            </div>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-white/12 bg-gradient-to-br from-white/[0.11] to-white/[0.03] p-6 md:p-8">
          <h2 className="text-2xl font-semibold text-white md:text-3xl">Platform Glossary</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {GLOSSARY.map(item => (
              <article key={item.term} className="rounded-xl border border-white/12 bg-white/[0.03] p-4">
                <h3 className="text-base font-semibold text-white">{item.term}</h3>
                <p className="mt-1 text-sm leading-6 text-white/78">{item.meaning}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/12 bg-white/[0.03] p-6 text-center md:p-8">
          <h2 className="text-2xl font-semibold text-white">Still need help?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/78 md:text-base">
            If your question is account specific, contact support with your registered email and relevant
            order details. For step by step process guidance, review the How It Works page.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/contact"
              className="rounded-full border border-white/25 bg-gradient-to-br from-white/[0.22] to-white/[0.08] px-5 py-2.5 text-sm font-semibold text-white transition hover:translate-y-[-2px]"
            >
              Contact Support
            </Link>
            <Link
              href="/how-it-works"
              className="rounded-full border border-white/18 bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/10"
            >
              Review How It Works
            </Link>
          </div>
        </section>
        </main>
      </div>

      <MarketingFooter />
    </div>
  )
}
