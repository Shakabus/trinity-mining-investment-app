'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import BitryxHeader from '@/components/marketing/BitryxHeader'
import MarketingFooter from '@/components/marketing/MarketingFooter'

type TermsSection = {
  id: string
  title: string
  paragraphs: string[]
}

const LAST_UPDATED = 'February 9, 2026'

const INTRO_TEXT =
  'These Terms and Conditions govern use of the Trinity in One platform, including mining plans, structured investment trading plans, account services, and related portfolio features. Please review this page carefully before creating an account, purchasing a plan, or submitting funds.'

const TERMS_SECTIONS: TermsSection[] = [
  {
    id: 'acceptance',
    title: '1. Acceptance Of Terms',
    paragraphs: [
      'By accessing or using Trinity in One, you confirm that you have read, understood, and accepted these Terms and Conditions and any additional policy referenced within this page. If you do not agree, you must stop using the platform immediately.',
      'These terms apply to all visitors, registered users, plan holders, referral participants, and any person interacting with Trinity in One services through web, mobile, API, support channels, or related communication interfaces.',
    ],
  },
  {
    id: 'eligibility',
    title: '2. Eligibility And Account Registration',
    paragraphs: [
      'You must be legally capable of entering a binding agreement in your jurisdiction. You are responsible for ensuring that platform use is permitted under local laws, regulations, and tax rules that apply to your location and activity.',
      'You agree to provide accurate registration data, maintain current account details, protect your authentication credentials, and notify Trinity in One promptly regarding unauthorized access, suspicious activity, or account compromise.',
    ],
  },
  {
    id: 'services',
    title: '3. Services Scope',
    paragraphs: [
      'Trinity in One provides infrastructure based services that include cloud linked cryptocurrency mining plan participation, structured investment trading plan access, account analytics, reporting dashboards, and associated operational support tools.',
      'Nothing in these services constitutes guaranteed profit, personalized investment advice, fiduciary management, brokerage representation, custody promise, or legal or tax advisory service unless explicitly documented in a signed addendum.',
    ],
  },
  {
    id: 'mining',
    title: '4. Mining Plan Operations',
    paragraphs: [
      'Mining plans allocate computational exposure based on plan parameters, available infrastructure capacity, network conditions, and operational safeguards. Displayed hashrate metrics represent platform level allocation models and monitored performance data.',
      'Mining outputs vary according to difficulty shifts, block reward dynamics, transaction fee conditions, pool performance, uptime events, energy constraints, and broader market volatility. Historical values do not establish future outcomes.',
    ],
  },
  {
    id: 'trading',
    title: '5. Investment Trading Plan Operations',
    paragraphs: [
      'Structured investment trading plans route capital through strategy frameworks with defined time windows, return multipliers, and execution controls. These plans are risk bearing products and can experience variance in realized performance.',
      'Projected multipliers, cycle estimates, scenario examples, and payout illustrations are informational models. Realized results may differ due to market liquidity, slippage, macro events, risk controls, and strategy level allocation rules.',
    ],
  },
  {
    id: 'real-assets',
    title: '6. Real Asset And Portfolio Exposure',
    paragraphs: [
      'Certain offerings may include references to real asset linked allocation themes, such as hospitality or property connected portfolio exposure. Such references describe portfolio orientation and do not create direct title ownership rights for users.',
      'Unless a separate instrument explicitly grants legal ownership interest, participation on Trinity in One remains a platform service arrangement and not a deed transfer, security issuance, or recorded ownership filing.',
    ],
  },
  {
    id: 'returns',
    title: '7. Returns, Estimates, And Risk Disclosure',
    paragraphs: [
      'All returns are performance dependent. Trinity in One does not promise fixed income, guaranteed appreciation, or loss prevention. Any estimated value displayed in dashboards, calculators, or plan descriptions is a model output and not a guarantee.',
      'You acknowledge the possibility of partial returns, delayed returns, reduced returns, or capital loss depending on infrastructure events, counterparty changes, market shocks, regulatory intervention, and force majeure conditions.',
    ],
  },
  {
    id: 'fees',
    title: '8. Fees, Charges, And Net Calculations',
    paragraphs: [
      'Applicable fees may include operational fees, maintenance fees, network costs, payout processing charges, conversion spreads, and other disclosed service charges. Fees can vary by plan tier, cycle, method, and active policy schedules.',
      'Net results shown to users are calculated after relevant charges. You are responsible for reviewing plan specific fee schedules before committing funds and for monitoring updates posted in platform notices or account communications.',
    ],
  },
  {
    id: 'funding',
    title: '9. Funding, Deposits, And Settlement',
    paragraphs: [
      'You are responsible for using correct wallet addresses, payment references, and supported funding methods. Incorrect transfer details, unsupported networks, and third party transfer errors can cause delays or unrecoverable loss.',
      'Trinity in One may apply confirmation thresholds, settlement windows, compliance checks, and fraud controls before funds are reflected in account balances or plan activations. Settlement times may vary by network traffic and provider constraints.',
    ],
  },
  {
    id: 'withdrawals',
    title: '10. Withdrawals And Payout Processing',
    paragraphs: [
      'Withdrawal eligibility depends on available balance status, active cycle rules, compliance review, account standing, and operational windows. Trinity in One may queue, review, or reject requests that violate policy or trigger risk controls.',
      'Processing times are estimates and may extend during network congestion, wallet maintenance, security checks, high volume periods, or provider interruptions. Users are responsible for submitting correct destination details.',
    ],
  },
  {
    id: 'compliance',
    title: '11. KYC, AML, And Sanctions Compliance',
    paragraphs: [
      'Trinity in One reserves the right to request identity verification, source of funds documentation, transaction explanations, and enhanced due diligence records where required by policy, law, or risk review triggers.',
      'Accounts linked to sanctions lists, prohibited jurisdictions, suspicious patterns, or unverifiable identity information may be restricted, suspended, or terminated. Trinity in One may file required reports with relevant authorities.',
    ],
  },
  {
    id: 'prohibited',
    title: '12. Prohibited Conduct',
    paragraphs: [
      'You may not use Trinity in One for unlawful activity, fraud, market manipulation, sanctions evasion, stolen asset movement, account takeover attempts, abusive automation, denial of service behavior, or intellectual property infringement.',
      'Any attempt to reverse engineer platform controls, bypass security systems, falsify payment evidence, exploit referral logic, or manipulate reporting data can result in immediate account action and potential legal escalation.',
    ],
  },
  {
    id: 'intellectual-property',
    title: '13. Intellectual Property',
    paragraphs: [
      'All software, interface systems, dashboards, analytics frameworks, copy, branding, logos, and visual elements on Trinity in One are protected by applicable intellectual property laws and remain property of Trinity in One or its licensors.',
      'You receive a limited, non exclusive, non transferable right to use platform services for authorized personal or business purposes under these terms. No rights are granted for resale, duplication, or derivative commercial exploitation.',
    ],
  },
  {
    id: 'privacy',
    title: '14. Data Privacy And Security',
    paragraphs: [
      'Trinity in One implements layered technical and organizational controls to protect user data. No internet connected system can provide absolute security, and users accept residual risk associated with digital communications and online platforms.',
      'Data handling practices are further described in the Privacy Policy. By using the platform, you consent to processing required to deliver services, satisfy compliance obligations, and maintain security, fraud monitoring, and audit requirements.',
    ],
  },
  {
    id: 'third-party',
    title: '15. Third Party Services',
    paragraphs: [
      'Platform operations may depend on third party providers including hosting vendors, liquidity venues, wallet services, mining pools, analytics tools, communication gateways, and compliance infrastructure partners.',
      'Trinity in One is not liable for disruption caused by third party outages, API changes, force majeure incidents, policy changes, or service terminations beyond reasonable operational control.',
    ],
  },
  {
    id: 'availability',
    title: '16. Platform Availability And Maintenance',
    paragraphs: [
      'Trinity in One may perform scheduled or emergency maintenance, security updates, infrastructure migrations, and service reconfiguration that can temporarily affect access, dashboard display, or transaction processing windows.',
      'We target reliable uptime but do not guarantee uninterrupted service. Operational incidents can include latency, stale market feeds, temporary calculation delay, and partial feature unavailability while remediation is in progress.',
    ],
  },
  {
    id: 'tax',
    title: '17. Tax Responsibility',
    paragraphs: [
      'You are solely responsible for determining, reporting, and paying any taxes, duties, levies, or reporting obligations arising from account activity, mining rewards, investment trading payouts, or referral related earnings.',
      'Trinity in One does not provide tax advice. You should consult qualified professionals in your jurisdiction to evaluate obligations before funding, trading, withdrawing, or reinvesting.',
    ],
  },
  {
    id: 'suspension',
    title: '18. Suspension And Termination',
    paragraphs: [
      'Trinity in One may suspend, limit, or terminate access where required for security, compliance, legal process, unresolved verification, unpaid obligations, prohibited activity, or serious breach of these terms.',
      'Upon termination, active review and settlement procedures may apply, and certain records may be retained as required by law, risk management standards, or audit obligations.',
    ],
  },
  {
    id: 'disputes',
    title: '19. Complaints And Dispute Process',
    paragraphs: [
      'If you have a complaint, you should first contact support with detailed evidence and requested remedy. Trinity in One will review submissions in good faith and provide a response in accordance with internal escalation standards.',
      'Unresolved matters may proceed under governing law and venue rules stated below, subject to applicable mandatory consumer protection provisions in the user jurisdiction.',
    ],
  },
  {
    id: 'liability',
    title: '20. Limitation Of Liability',
    paragraphs: [
      'To the fullest extent permitted by law, Trinity in One and affiliated parties are not liable for indirect, incidental, special, punitive, exemplary, or consequential damages arising from platform use or inability to use the platform.',
      'Total liability for direct damages, where not excluded by law, is limited to the total service fees paid by the affected user to Trinity in One in the twelve month period preceding the claim event.',
    ],
  },
  {
    id: 'governing-law',
    title: '21. Governing Law',
    paragraphs: [
      'These Terms and Conditions are governed by applicable contractual laws determined by Trinity in One legal structure and disclosed venue requirements, unless mandatory local consumer law provides otherwise.',
      'You agree to cooperate with lawful information requests and court or regulatory processes where required by legal authority with proper jurisdiction.',
    ],
  },
  {
    id: 'updates',
    title: '22. Changes To These Terms',
    paragraphs: [
      'Trinity in One may update these terms to reflect service changes, legal requirements, risk controls, or operational policy revisions. Updated terms become effective on publication unless otherwise stated.',
      'Continued use after updates indicates acceptance of revised terms. If you do not agree with revised terms, you must discontinue service use and request closure according to applicable policy.',
    ],
  },
  {
    id: 'contact',
    title: '23. Legal Contact',
    paragraphs: [
      'For legal notices related to these terms, use the official contact channels published on the Contact page. Include your registered account email, subject line, and supporting documentation for faster review.',
      'Operational support requests should be submitted through the support workflow. Legal disputes, compliance notices, and formal claims should be clearly marked as legal correspondence.',
    ],
  },
]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function renderHighlightedChar(char: string, highlighted: boolean, key: string) {
  return (
    <span
      key={key}
      className={`inline-block transition-colors duration-100 ${
        highlighted ? 'text-white' : 'text-[#2ECC711F]'
      }`}
    >
      {char === ' ' ? '\u00A0' : char}
    </span>
  )
}

export default function TermsAndConditionsPage() {
  const introRef = useRef<HTMLElement | null>(null)
  const [progress, setProgress] = useState(0)
  const introChars = useMemo(() => Array.from(INTRO_TEXT), [])

  useEffect(() => {
    const updateProgress = () => {
      if (!introRef.current) return

      const rect = introRef.current.getBoundingClientRect()
      const start = window.innerHeight * 0.82
      const end = window.innerHeight * 0.32
      const span = rect.height + (start - end)
      const amount = start - rect.top
      setProgress(clamp(amount / span, 0, 1))
    }

    updateProgress()
    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)

    return () => {
      window.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateProgress)
    }
  }, [])

  const highlightedCount = Math.floor(progress * introChars.length)

  return (
    <div className="min-h-screen bg-black text-white marketing-page">
      <div className="marketing-page-content">
        <div className="mx-auto w-full max-w-6xl px-6 pt-6">
          <BitryxHeader />
        </div>

        <main className="mx-auto w-full max-w-6xl px-6 pb-14 pt-28">
        <section className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.11] to-white/[0.03] p-7 shadow-[0_12px_40px_rgba(0,0,0,0.45)] md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
            Legal
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight md:text-5xl">
            Terms &amp; Conditions
          </h1>
          <p className="mt-3 text-sm text-white/65 md:text-base">Last updated: {LAST_UPDATED}</p>
          <section ref={introRef} className="mt-6 max-w-4xl font-['Inter'] text-[1.02rem] font-light leading-7 md:text-[1.12rem]">
            {introChars.map((char, index) =>
              renderHighlightedChar(char, index < highlightedCount, `intro-${index}`),
            )}
          </section>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-28 rounded-2xl border border-white/12 bg-white/[0.03] p-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                Sections
              </h2>
              <ol className="mt-4 space-y-2 text-sm text-white/70">
                {TERMS_SECTIONS.map(section => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="block rounded-lg px-2 py-1 transition hover:bg-white/10 hover:text-white"
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </aside>

          <div className="space-y-5">
            {TERMS_SECTIONS.map(section => (
              <article
                id={section.id}
                key={section.id}
                className="rounded-2xl border border-white/12 bg-gradient-to-br from-white/[0.1] to-white/[0.02] p-6 shadow-[0_8px_28px_rgba(0,0,0,0.35)] md:p-7"
              >
                <h2 className="text-xl font-semibold text-white md:text-2xl">{section.title}</h2>
                <div className="mt-3 space-y-3">
                  {section.paragraphs.map((paragraph, index) => (
                    <p
                      key={`${section.id}-p-${index}`}
                      className="font-['Inter'] text-sm leading-7 text-white/82 md:text-[0.98rem]"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
        </main>
      </div>

      <MarketingFooter />
    </div>
  )
}
