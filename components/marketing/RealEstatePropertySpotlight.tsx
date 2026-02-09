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
        projectedBand: '0.8% - 1.2% monthly (performance-based)',
      },
      {
        tier: 'Hospitality Revenue Pool',
        minimum: '$15,000',
        duration: '18 months',
        payoutModel: 'Monthly hotel operating surplus share',
        projectedBand: '1.0% - 1.6% monthly (performance-based)',
      },
      {
        tier: 'Floor Allocation Plus',
        minimum: '$35,000',
        duration: '24 months',
        payoutModel: 'Blended room + F&B revenue split',
        projectedBand: '1.2% - 1.9% monthly (performance-based)',
      },
      {
        tier: 'Strategic Asset Allocation',
        minimum: '$75,000',
        duration: '36 months',
        payoutModel: 'Priority allocation with blended yield',
        projectedBand: '1.4% - 2.2% monthly (performance-based)',
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
        projectedBand: '0.9% - 1.3% monthly (performance-based)',
      },
      {
        tier: 'Premium Operations Pool',
        minimum: '$20,000',
        duration: '18 months',
        payoutModel: 'Monthly rooms + event surplus participation',
        projectedBand: '1.1% - 1.7% monthly (performance-based)',
      },
      {
        tier: 'Hospitality Yield Plus',
        minimum: '$45,000',
        duration: '24 months',
        payoutModel: 'Blended occupancy and outlet revenue split',
        projectedBand: '1.3% - 2.0% monthly (performance-based)',
      },
      {
        tier: 'Executive Asset Allocation',
        minimum: '$90,000',
        duration: '36 months',
        payoutModel: 'Priority monthly yield with strategic weighting',
        projectedBand: '1.5% - 2.3% monthly (performance-based)',
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
