'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import styles from '@/components/marketing/RealEstatePropertySpotlight.module.css'

const BUY_IN_OPTIONS = [
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
]

export default function RealEstatePropertySpotlight() {
  const [open, setOpen] = useState(false)

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Featured Asset Under Management</h2>
      <p className={styles.subheading}>
        First property spotlight: The Hoxton, Poblenou in Barcelona. This
        asset is positioned for mixed hospitality and occupancy-driven income
        participation with structured monthly distribution logic.
      </p>

      <article className={styles.card}>
        <div className={styles.imageWrap}>
          <Image
            src="/properties/hoxton-poblenou.jpg"
            alt="The Hoxton Poblenou Barcelona"
            fill
            className={styles.image}
            sizes="(max-width: 1024px) 100vw, 1100px"
            onError={event => {
              const target = event.currentTarget as HTMLImageElement
              target.style.display = 'none'
              const fallback = target.nextElementSibling as HTMLElement | null
              if (fallback) fallback.style.display = 'grid'
            }}
          />
          <div className={styles.imagePlaceholder} style={{ display: 'none' }}>
            Add property image: /public/properties/hoxton-poblenou.jpg
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.titleRow}>
            <div>
              <h3 className={styles.title}>The Hoxton, Poblenou</h3>
              <p className={styles.location}>Barcelona, Spain</p>
            </div>
            <span className={styles.tag}>Hospitality Asset</span>
          </div>

          <p className={styles.summary}>
            A design-forward hotel in the 22@ district with strong lifestyle
            demand factors. Trinity structures this property as a managed
            income opportunity where users can choose tiered buy-in models
            tied to monthly performance cycles.
          </p>

          <div className={styles.facts}>
            <div className={styles.fact}>
              <div className={styles.factLabel}>Address</div>
              <div className={styles.factValue}>Avinguda Diagonal 205</div>
            </div>
            <div className={styles.fact}>
              <div className={styles.factLabel}>City</div>
              <div className={styles.factValue}>Barcelona 08018</div>
            </div>
            <div className={styles.fact}>
              <div className={styles.factLabel}>Asset Scale</div>
              <div className={styles.factValue}>240-room hospitality profile</div>
            </div>
            <div className={styles.fact}>
              <div className={styles.factLabel}>Income Logic</div>
              <div className={styles.factValue}>Monthly operational revenue share</div>
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.btnGhost} onClick={() => setOpen(true)}>
              View Full Details
            </button>
            <Link href="/dashboard/real-estate" className={styles.btnPrimary}>
              Buy In From Dashboard
            </Link>
          </div>
        </div>
      </article>

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div className={styles.modal} onClick={event => event.stopPropagation()}>
            <div className={styles.modalInner}>
              <div className={styles.modalTop}>
                <div>
                  <h3 className={styles.modalTitle}>The Hoxton, Poblenou Barcelona</h3>
                  <p className={styles.modalLocation}>
                    Avinguda Diagonal 205, Sant Marti, 08018 Barcelona, Spain
                  </p>
                </div>
                <button type="button" className={styles.close} onClick={() => setOpen(false)}>
                  x
                </button>
              </div>

              <div className={styles.modalGrid}>
                <section className={styles.block}>
                  <h4 className={styles.blockTitle}>Property Overview</h4>
                  <p className={styles.blockText}>
                    The Hoxton Poblenou sits in Barcelonas innovation corridor
                    and blends business travel, lifestyle tourism, rooftop
                    hospitality, and neighborhood foot traffic. Trinity presents
                    this asset as a performance-linked managed income product
                    suitable for investors seeking recurring hospitality-backed
                    cash-flow participation.
                  </p>
                </section>

                <section className={styles.block}>
                  <h4 className={styles.blockTitle}>Operational Highlights</h4>
                  <ul className={styles.list}>
                    <li>240-key hotel footprint in Poblenou / 22@ district</li>
                    <li>Rooftop destination and F&B traffic advantages</li>
                    <li>Mixed business and leisure demand profile</li>
                    <li>Monthly reporting and distribution cycle model</li>
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
                    {BUY_IN_OPTIONS.map(option => (
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
                <button type="button" className={styles.btnGhost} onClick={() => setOpen(false)}>
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
