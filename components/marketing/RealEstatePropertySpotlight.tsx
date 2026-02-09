'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import styles from '@/components/marketing/RealEstatePropertySpotlight.module.css'

type BuyInOption = {
  tier: string
  minimum: string
  duration: string
  payoutModel: string
  projectedBand: string
  illustrativeOutcome: string
}

type PropertyItem = {
  id: string
  title: string
  location: string
  tag: string
  summary: string
  imageSrc: string
  imageFallback: string
  facts: Array<{ label: string; value: string }>
  modalTitle: string
  modalLocation: string
  overview: string
  highlights: string[]
  options: BuyInOption[]
}

const PROPERTIES: PropertyItem[] = [
  {
    id: 'hoxton-poblenou',
    title: 'The Hoxton, Poblenou',
    location: 'Barcelona, Spain',
    tag: 'Hospitality Asset',
    summary:
      'A design-forward hotel in the 22@ district with strong lifestyle demand factors. Trinity structures this asset as a managed income opportunity where users can choose tiered buy-in models tied to monthly performance cycles.',
    imageSrc: '/properties/hoxton-poblenou.jpg',
    imageFallback: 'Add property image: /public/properties/hoxton-poblenou.jpg',
    facts: [
      { label: 'Address', value: 'Avinguda Diagonal 205' },
      { label: 'City', value: 'Barcelona 08018' },
      { label: 'Asset Scale', value: '240-room hospitality profile' },
      { label: 'Income Logic', value: 'Monthly operational revenue share' },
    ],
    modalTitle: 'The Hoxton, Poblenou Barcelona',
    modalLocation: 'Avinguda Diagonal 205, Sant Marti, 08018 Barcelona, Spain',
    overview:
      'The Hoxton Poblenou sits in Barcelonas innovation corridor and blends business travel, lifestyle tourism, rooftop hospitality, and neighborhood foot traffic. Trinity presents this asset as a performance-linked managed income product suitable for recurring hospitality-backed cash-flow participation.',
    highlights: [
      '240-key hotel footprint in Poblenou / 22@ district',
      'Rooftop destination and F&B traffic advantages',
      'Mixed business and leisure demand profile',
      'Monthly reporting and distribution cycle model',
    ],
    options: [
      {
        tier: 'Condo Income Entry',
        minimum: '$5,000',
        duration: '12 months',
        payoutModel: 'Monthly rental-income share',
        projectedBand: '9% - 14% annualized (performance-based)',
        illustrativeOutcome: '$5,000 -> $5,450-$5,700 in 12 months',
      },
      {
        tier: 'Hospitality Revenue Pool',
        minimum: '$15,000',
        duration: '18 months',
        payoutModel: 'Monthly hotel operating surplus share',
        projectedBand: '11% - 18% annualized (performance-based)',
        illustrativeOutcome: '$15,000 -> $17,475-$19,050 over 18 months',
      },
      {
        tier: 'Floor Allocation Plus',
        minimum: '$35,000',
        duration: '24 months',
        payoutModel: 'Blended room + F&B revenue split',
        projectedBand: '13% - 21% annualized (performance-based)',
        illustrativeOutcome: '$35,000 -> $44,100-$49,700 over 24 months',
      },
      {
        tier: 'Strategic Asset Allocation',
        minimum: '$75,000',
        duration: '36 months',
        payoutModel: 'Priority allocation with blended yield',
        projectedBand: '15% - 24% annualized (performance-based)',
        illustrativeOutcome: '$75,000 -> $113,250-$129,000 over 36 months',
      },
    ],
  },
  {
    id: 'fairmont-olympic-seattle',
    title: 'Fairmont Olympic Hotel',
    location: 'Seattle, Washington, USA',
    tag: 'Landmark Hotel Asset',
    summary:
      'A historic luxury hospitality property in downtown Seattle positioned for high-value business and premium leisure demand. Trinity frames this asset as a managed monthly income participation model tied to hotel performance cycles.',
    imageSrc: '/properties/fairmont-olympic-seattle.jpg',
    imageFallback: 'Add property image: /public/properties/fairmont-olympic-seattle.jpg',
    facts: [
      { label: 'Address', value: '411 University Street' },
      { label: 'City', value: 'Seattle, WA 98101' },
      { label: 'Asset Scale', value: '450-room landmark hotel profile' },
      { label: 'Income Logic', value: 'Monthly hospitality revenue share' },
    ],
    modalTitle: 'Fairmont Olympic Hotel, Seattle',
    modalLocation: '411 University St, Seattle, Washington 98101, USA',
    overview:
      'Fairmont Olympic is a flagship luxury hospitality asset in central Seattle with strong event, corporate, and premium guest positioning. Trinity uses a structured participation model that links user buy-ins to monthly operating performance and defined distribution windows.',
    highlights: [
      'Iconic downtown Seattle full-block luxury hotel footprint',
      'High conference, events, and premium occupancy demand profile',
      'Diversified revenue mix across rooms, dining, and events',
      'Monthly reporting and distribution framework under Trinity oversight',
    ],
    options: [
      {
        tier: 'Hotel Income Starter',
        minimum: '$7,500',
        duration: '12 months',
        payoutModel: 'Monthly net room-revenue participation',
        projectedBand: '10% - 15% annualized (performance-based)',
        illustrativeOutcome: '$7,500 -> $8,250-$8,625 in 12 months',
      },
      {
        tier: 'Premium Operations Pool',
        minimum: '$20,000',
        duration: '18 months',
        payoutModel: 'Monthly rooms + event surplus participation',
        projectedBand: '12% - 19% annualized (performance-based)',
        illustrativeOutcome: '$20,000 -> $23,600-$25,700 over 18 months',
      },
      {
        tier: 'Hospitality Yield Plus',
        minimum: '$45,000',
        duration: '24 months',
        payoutModel: 'Blended occupancy and outlet revenue split',
        projectedBand: '14% - 22% annualized (performance-based)',
        illustrativeOutcome: '$45,000 -> $57,600-$64,800 over 24 months',
      },
      {
        tier: 'Executive Asset Allocation',
        minimum: '$90,000',
        duration: '36 months',
        payoutModel: 'Priority monthly yield with strategic weighting',
        projectedBand: '16% - 25% annualized (performance-based)',
        illustrativeOutcome: '$90,000 -> $136,800-$157,500 over 36 months',
      },
    ],
  },
  {
    id: 'standard-london',
    title: 'The Standard, London',
    location: 'London, England, UK',
    tag: 'Urban Lifestyle Hotel',
    summary:
      'A prominent Kings Cross hospitality asset with strong business, rail-hub, and lifestyle demand patterns. Trinity positions this property for structured monthly income participation with tiered entry options.',
    imageSrc: '/properties/standard-london.jpg',
    imageFallback: 'Add property image: /public/properties/standard-london.jpg',
    facts: [
      { label: 'Address', value: '10 Argyle Street' },
      { label: 'City', value: 'London WC1H 8EG' },
      { label: 'Asset Scale', value: '266-room hospitality profile' },
      { label: 'Income Logic', value: 'Monthly occupancy-linked yield share' },
    ],
    modalTitle: 'The Standard, London',
    modalLocation: '10 Argyle St, London WC1H 8EG, United Kingdom',
    overview:
      'The Standard, London is a centrally located hospitality asset adjacent to Kings Cross with high transport connectivity and premium demand overlap across business and leisure segments. Trinity structures this property as a managed monthly return lane tied to operating performance and controlled payout windows.',
    highlights: [
      'Prime Kings Cross transport and tourism node positioning',
      'Lifestyle-hospitality demand plus business travel overlap',
      'Strong potential from room, dining, and event utilization',
      'Managed monthly distribution model with cycle reporting',
    ],
    options: [
      {
        tier: 'Urban Entry Allocation',
        minimum: '$5,000',
        duration: '12 months',
        payoutModel: 'Monthly room-revenue participation',
        projectedBand: '11% - 17% annualized (performance-based)',
        illustrativeOutcome: '$5,000 -> $5,550-$5,850 in 12 months',
      },
      {
        tier: 'Kings Cross Revenue Pool',
        minimum: '$18,000',
        duration: '18 months',
        payoutModel: 'Monthly room + outlet surplus participation',
        projectedBand: '13% - 21% annualized (performance-based)',
        illustrativeOutcome: '$18,000 -> $22,000-$23,670 over 18 months',
      },
      {
        tier: 'Prime Hospitality Plus',
        minimum: '$40,000',
        duration: '24 months',
        payoutModel: 'Blended occupancy and premium spend split',
        projectedBand: '15% - 24% annualized (performance-based)',
        illustrativeOutcome: '$40,000 -> $52,000-$59,200 over 24 months',
      },
      {
        tier: 'Executive London Allocation',
        minimum: '$85,000',
        duration: '36 months',
        payoutModel: 'Priority weighted monthly yield participation',
        projectedBand: '17% - 27% annualized (performance-based)',
        illustrativeOutcome: '$85,000 -> $128,350-$153,850 over 36 months',
      },
    ],
  },
]

export default function RealEstatePropertySpotlight() {
  const [openId, setOpenId] = useState<string | null>(null)

  const openProperty = useMemo(
    () => PROPERTIES.find(property => property.id === openId) ?? null,
    [openId],
  )

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Featured Assets Under Management</h2>
      <p className={styles.subheading}>
        Property spotlights are presented with summary, operational profile, and
        structured buy-in tiers so users can compare participation paths before
        entering the dashboard purchase flow.
      </p>

      <div className={styles.cards}>
        {PROPERTIES.map(property => (
          <article key={property.id} className={styles.card}>
            <div className={styles.imageWrap}>
              <Image
                src={property.imageSrc}
                alt={property.modalTitle}
                fill
                className={styles.image}
                sizes="(max-width: 1080px) 100vw, 50vw"
                onError={event => {
                  const target = event.currentTarget as HTMLImageElement
                  target.style.display = 'none'
                  const fallback = target.nextElementSibling as HTMLElement | null
                  if (fallback) fallback.style.display = 'grid'
                }}
              />
              <div className={styles.imagePlaceholder} style={{ display: 'none' }}>
                {property.imageFallback}
              </div>
            </div>

            <div className={styles.body}>
              <div className={styles.titleRow}>
                <div>
                  <h3 className={styles.title}>{property.title}</h3>
                  <p className={styles.location}>{property.location}</p>
                </div>
                <span className={styles.tag}>{property.tag}</span>
              </div>

              <p className={styles.summary}>{property.summary}</p>

              <div className={styles.facts}>
                {property.facts.map(fact => (
                  <div key={fact.label} className={styles.fact}>
                    <div className={styles.factLabel}>{fact.label}</div>
                    <div className={styles.factValue}>{fact.value}</div>
                  </div>
                ))}
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => setOpenId(property.id)}
                >
                  View Full Details
                </button>
                <Link href="/dashboard/real-estate" className={styles.btnPrimary}>
                  Buy In From Dashboard
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      {openProperty && (
        <div className={styles.overlay} onClick={() => setOpenId(null)}>
          <div className={styles.modal} onClick={event => event.stopPropagation()}>
            <div className={styles.modalInner}>
              <div className={styles.modalTop}>
                <div>
                  <h3 className={styles.modalTitle}>{openProperty.modalTitle}</h3>
                  <p className={styles.modalLocation}>{openProperty.modalLocation}</p>
                </div>
                <button type="button" className={styles.close} onClick={() => setOpenId(null)}>
                  x
                </button>
              </div>

              <div className={styles.modalGrid}>
                <section className={styles.block}>
                  <h4 className={styles.blockTitle}>Property Overview</h4>
                  <p className={styles.blockText}>{openProperty.overview}</p>
                </section>

                <section className={styles.block}>
                  <h4 className={styles.blockTitle}>Operational Highlights</h4>
                  <ul className={styles.list}>
                    {openProperty.highlights.map(highlight => (
                      <li key={highlight}>{highlight}</li>
                    ))}
                  </ul>
                </section>
              </div>

              <section className={styles.options}>
                <table>
                  <thead>
                    <tr>
                      <th>Buy-In Tier</th>
                      <th>Minimum</th>
                      <th>Duration</th>
                      <th>Payout Basis</th>
                      <th>Projected Return Band</th>
                      <th>Illustrative Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openProperty.options.map(option => (
                      <tr key={option.tier}>
                        <td>{option.tier}</td>
                        <td>{option.minimum}</td>
                        <td>{option.duration}</td>
                        <td>{option.payoutModel}</td>
                        <td>{option.projectedBand}</td>
                        <td>{option.illustrativeOutcome}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>


              <div className={styles.modalActions}>
                <Link href="/dashboard/real-estate" className={styles.btnPrimary}>
                  Continue To Buy-In Flow
                </Link>
                <button type="button" className={styles.btnGhost} onClick={() => setOpenId(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
