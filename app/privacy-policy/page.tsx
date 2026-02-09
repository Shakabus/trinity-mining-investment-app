'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import BitryxHeader from '@/components/marketing/BitryxHeader'
import MarketingFooter from '@/components/marketing/MarketingFooter'

type PolicySection = {
  id: string
  title: string
  paragraphs: string[]
}

const LAST_UPDATED = 'February 9, 2026'

const INTRO_TEXT =
  'This Privacy Policy explains how Trinity in One collects, uses, shares, stores, and protects personal information across mining services, investment trading services, dashboard features, account support channels, and related operational systems.'

const POLICY_SECTIONS: PolicySection[] = [
  {
    id: 'scope',
    title: '1. Scope And Applicability',
    paragraphs: [
      'This Privacy Policy applies to all personal information processed by Trinity in One through websites, dashboards, mobile experiences, support channels, compliance workflows, account onboarding, and related business operations.',
      'By using Trinity in One services, you acknowledge the data practices described in this policy. If you disagree with any term, you should discontinue use and contact support regarding account closure options.',
    ],
  },
  {
    id: 'data-we-collect',
    title: '2. Information We Collect',
    paragraphs: [
      'We collect information you provide directly, including identity details, contact information, account credentials, support messages, payment references, and documents submitted for verification, compliance, or operational review.',
      'We also collect technical and behavioral data, such as device metadata, log events, usage patterns, session activity, transaction traces, and security indicators required for platform performance, fraud prevention, and service reliability.',
    ],
  },
  {
    id: 'categories',
    title: '3. Personal Data Categories',
    paragraphs: [
      'Data categories may include name, email, phone number, billing details, account identifiers, authentication artifacts, wallet addresses, KYC documentation, support attachments, referral references, and communication records.',
      'Depending on jurisdiction and product usage, we may process risk screening results, sanctions checks, source of funds information, and enhanced due diligence records required for legal and compliance obligations.',
    ],
  },
  {
    id: 'collection-methods',
    title: '4. How Data Is Collected',
    paragraphs: [
      'Information is collected through registration forms, plan purchases, funding events, dashboard actions, API interactions, support requests, cookies, analytics systems, and security monitoring tools integrated into platform operations.',
      'We may also receive data from service providers, public sources, verification vendors, payment processors, and compliance partners where such data is required to validate accounts and maintain lawful platform activity.',
    ],
  },
  {
    id: 'purposes',
    title: '5. Why We Use Your Information',
    paragraphs: [
      'Trinity in One uses data to create and administer accounts, deliver mining and investment services, process plan activity, calculate results, generate reporting, provide customer support, and enforce platform risk controls.',
      'Information is additionally used for legal compliance, fraud detection, incident response, identity verification, system performance analysis, audit readiness, and continuous improvement of product quality and user experience.',
    ],
  },
  {
    id: 'legal-basis',
    title: '6. Legal Bases For Processing',
    paragraphs: [
      'Where required by applicable law, we process personal data based on contractual necessity, legitimate interests, consent where applicable, legal obligations, and protection of platform integrity, users, and business operations.',
      'If consent is used as a legal basis for specific processing, you may withdraw consent subject to operational, legal, and contractual limits. Withdrawal does not affect prior lawful processing.',
    ],
  },
  {
    id: 'mining-trading-context',
    title: '7. Mining And Investment Service Context',
    paragraphs: [
      'Data tied to mining and investment features can include plan participation records, payout history, cycle status, dashboard performance metrics, and account level activity required to provide transparent operational reporting.',
      'These records are used to support service delivery, dispute handling, compliance verification, and platform integrity. They are not sold as third party marketing profiles and remain governed by this policy.',
    ],
  },
  {
    id: 'cookies',
    title: '8. Cookies And Similar Technologies',
    paragraphs: [
      'We use cookies and related technologies for authentication, session continuity, user preferences, analytics, abuse prevention, and security monitoring. Some cookies are essential for account access and feature functionality.',
      'You can adjust browser settings to manage cookies, but blocking required cookies may affect login behavior, dashboard persistence, and overall service performance.',
    ],
  },
  {
    id: 'communications',
    title: '9. Communications',
    paragraphs: [
      'We send operational communications related to account activity, security alerts, support responses, compliance requests, payout notices, and policy updates. These notices may be essential for safe platform use.',
      'Marketing communications are optional where required by law. You may opt out of non essential promotional messages through available unsubscribe mechanisms.',
    ],
  },
  {
    id: 'sharing',
    title: '10. Data Sharing And Disclosure',
    paragraphs: [
      'We may share personal data with trusted processors and service providers that support hosting, analytics, compliance, payments, messaging, fraud monitoring, customer support, and infrastructure operations.',
      'We may disclose information where required by law, court order, regulatory demand, fraud investigation, sanctions compliance, or to protect the rights, safety, and lawful interests of Trinity in One and its users.',
    ],
  },
  {
    id: 'cross-border',
    title: '11. International Data Transfers',
    paragraphs: [
      'Because Trinity in One operates across multiple regions, personal data may be processed in jurisdictions different from your residence. We apply contractual and technical safeguards where cross border transfer rules require them.',
      'Transfer protections may include standard contractual clauses, vendor due diligence, encryption practices, and access controls aligned with applicable legal standards.',
    ],
  },
  {
    id: 'retention',
    title: '12. Data Retention',
    paragraphs: [
      'We retain personal data only for as long as needed to fulfill service purposes, legal obligations, compliance records, dispute resolution, fraud prevention, security investigations, and legitimate operational requirements.',
      'Retention periods vary by data type, account status, regulatory obligations, and litigation hold requirements. When retention is no longer required, data is deleted or irreversibly anonymized.',
    ],
  },
  {
    id: 'security',
    title: '13. Security Measures',
    paragraphs: [
      'Trinity in One applies layered administrative, technical, and physical safeguards including encryption controls, restricted access, audit logging, segmentation, secure development practices, and incident response procedures.',
      'No internet connected environment can guarantee absolute security. Users should maintain strong credentials, avoid sharing account access, and report suspicious activity immediately.',
    ],
  },
  {
    id: 'incident-response',
    title: '14. Security Incidents',
    paragraphs: [
      'In the event of a confirmed security incident affecting personal data, Trinity in One will investigate, contain, remediate, and provide required notices under applicable law and contractual obligations.',
      'Notification timing and detail may vary by jurisdiction, incident scope, and law enforcement coordination requirements.',
    ],
  },
  {
    id: 'rights',
    title: '15. Your Privacy Rights',
    paragraphs: [
      'Depending on your jurisdiction, you may have rights to access, correct, delete, restrict, object to processing, request portability, withdraw consent, and lodge complaints with supervisory authorities.',
      'To exercise rights, submit a verifiable request through support channels. We may request identity confirmation before processing rights requests to protect account security.',
    ],
  },
  {
    id: 'children',
    title: '16. Minors And Age Restrictions',
    paragraphs: [
      'Trinity in One services are not intended for minors. We do not knowingly collect personal data from individuals who are not legally permitted to use the platform in their jurisdiction.',
      'If we learn that prohibited minor data has been provided, we will take steps to remove or restrict such information in accordance with law and operational requirements.',
    ],
  },
  {
    id: 'automated',
    title: '17. Automated Decision Support',
    paragraphs: [
      'Certain controls may use automated indicators for fraud scoring, anomaly detection, account risk flagging, or operational queueing. These systems support internal review and are not a sole guarantee of account outcomes.',
      'Where required by law, users may request further information regarding materially significant automated processing affecting account access or transaction handling.',
    ],
  },
  {
    id: 'third-party-links',
    title: '18. Third Party Links And Services',
    paragraphs: [
      'Platform pages may reference third party links, widgets, and service integrations. Trinity in One is not responsible for privacy practices of external websites or providers outside our controlled systems.',
      'Users should review the privacy policies of third party services before providing information through external interfaces.',
    ],
  },
  {
    id: 'policy-changes',
    title: '19. Policy Updates',
    paragraphs: [
      'We may revise this Privacy Policy to reflect legal changes, product evolution, security standards, and operational improvements. Updated versions become effective on publication unless stated otherwise.',
      'Material changes may be communicated through account notices, email, or dashboard announcements where required by law.',
    ],
  },
  {
    id: 'contact',
    title: '20. Contact And Data Requests',
    paragraphs: [
      'For privacy inquiries, data access requests, correction requests, or deletion requests, contact Trinity in One through the official support and contact channels listed on the platform.',
      'Please include your registered email address, request type, and supporting context so requests can be processed accurately and securely.',
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

export default function PrivacyPolicyPage() {
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
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-6xl px-6 pt-6">
        <BitryxHeader />
      </div>

      <main className="mx-auto w-full max-w-6xl px-6 pb-14 pt-28">
        <section className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.11] to-white/[0.03] p-7 shadow-[0_12px_40px_rgba(0,0,0,0.45)] md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
            Legal
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight md:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-white/65 md:text-base">Last updated: {LAST_UPDATED}</p>
          <section
            ref={introRef}
            className="mt-6 max-w-4xl font-['Inter'] text-[1.02rem] font-light leading-7 md:text-[1.12rem]"
          >
            {introChars.map((char, index) =>
              renderHighlightedChar(char, index < highlightedCount, `intro-${index}`),
            )}
          </section>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-28 rounded-2xl border border-white/12 bg-white/[0.03] p-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                Policy Index
              </h2>
              <ol className="mt-4 space-y-2 text-sm text-white/70">
                {POLICY_SECTIONS.map(section => (
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
            {POLICY_SECTIONS.map(section => (
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

      <MarketingFooter />
    </div>
  )
}

