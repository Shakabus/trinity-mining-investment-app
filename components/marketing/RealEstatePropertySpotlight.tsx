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
  imageAlternates?: string[]
  imageFallback: string
  facts: Array<{ label: string; value: string }>
  modalTitle: string
  modalLocation: string
  overview: string
  highlights: string[]
  options: BuyInOption[]
}

function expandImagePath(path: string) {
  const normalized = path.trim()
  const match = normalized.match(/^(.*?)(\.[a-zA-Z0-9]+)$/)
  if (!match) {
    return [normalized, `${normalized}.jpg`, `${normalized}.jpeg`, `${normalized}.png`, `${normalized}.webp`]
  }

  const base = match[1]
  const originalExt = match[2]
  const extOrder = [originalExt.toLowerCase(), '.jpg', '.jpeg', '.png', '.webp']
  return Array.from(new Set(extOrder)).map(ext => `${base}${ext}`)
}

function buildImageCandidates(paths: string[]) {
  return Array.from(new Set(paths.flatMap(expandImagePath)))
}

function PropertyImage({
  src,
  alternates,
  alt,
  fallbackText,
}: {
  src: string
  alternates?: string[]
  alt: string
  fallbackText: string
}) {
  const candidates = useMemo(() => buildImageCandidates([src, ...(alternates ?? [])]), [src, alternates])
  const [candidateIndex, setCandidateIndex] = useState(0)
  const [failed, setFailed] = useState(false)

  const activeSrc = candidates[candidateIndex] ?? src

  if (failed) {
    return <div className={styles.imagePlaceholder}>{fallbackText}</div>
  }

  return (
    <Image
      key={activeSrc}
      src={activeSrc}
      alt={alt}
      fill
      className={styles.image}
      sizes="(max-width: 1080px) 100vw, 50vw"
      onError={() => {
        if (candidateIndex < candidates.length - 1) {
          setCandidateIndex(prev => prev + 1)
          return
        }
        setFailed(true)
      }}
    />
  )
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
    imageAlternates: ['/properties/hoxton-poblenou-barcelona.jpg'],
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
        projectedBand: '150% - 210% total cycle',
        illustrativeOutcome: '$5,000 -> $12,500-$15,500 in 12 months',
      },
      {
        tier: 'Hospitality Revenue Pool',
        minimum: '$16,500',
        duration: '18 months',
        payoutModel: 'Monthly hotel operating surplus share',
        projectedBand: '180% - 250% total cycle',
        illustrativeOutcome: '$16,500 -> $46,200-$57,750 over 18 months',
      },
      {
        tier: 'Floor Allocation Plus',
        minimum: '$37,500',
        duration: '24 months',
        payoutModel: 'Blended room + F&B revenue split',
        projectedBand: '220% - 300% total cycle',
        illustrativeOutcome: '$37,500 -> $120,000-$150,000 over 24 months',
      },
      {
        tier: 'Strategic Asset Allocation',
        minimum: '$82,000',
        duration: '36 months',
        payoutModel: 'Priority allocation with blended yield',
        projectedBand: '260% - 350% total cycle',
        illustrativeOutcome: '$82,000 -> $295,200-$369,000 over 36 months',
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
    imageAlternates: ['/properties/fairmont-olympic-hotel-seattle.jpg'],
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
        projectedBand: '145% - 205% total cycle',
        illustrativeOutcome: '$7,500 -> $18,375-$22,875 in 12 months',
      },
      {
        tier: 'Premium Operations Pool',
        minimum: '$22,500',
        duration: '18 months',
        payoutModel: 'Monthly rooms + event surplus participation',
        projectedBand: '175% - 245% total cycle',
        illustrativeOutcome: '$22,500 -> $61,875-$77,625 over 18 months',
      },
      {
        tier: 'Hospitality Yield Plus',
        minimum: '$48,000',
        duration: '24 months',
        payoutModel: 'Blended occupancy and outlet revenue split',
        projectedBand: '215% - 295% total cycle',
        illustrativeOutcome: '$48,000 -> $151,200-$189,600 over 24 months',
      },
      {
        tier: 'Executive Asset Allocation',
        minimum: '$95,000',
        duration: '36 months',
        payoutModel: 'Priority monthly yield with strategic weighting',
        projectedBand: '255% - 345% total cycle',
        illustrativeOutcome: '$95,000 -> $337,250-$422,750 over 36 months',
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
    imageAlternates: ['/properties/the-standard-london.jpg'],
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
        minimum: '$6,000',
        duration: '12 months',
        payoutModel: 'Monthly room-revenue participation',
        projectedBand: '150% - 215% total cycle',
        illustrativeOutcome: '$6,000 -> $15,000-$18,900 in 12 months',
      },
      {
        tier: 'Kings Cross Revenue Pool',
        minimum: '$18,000',
        duration: '18 months',
        payoutModel: 'Monthly room + outlet surplus participation',
        projectedBand: '185% - 255% total cycle',
        illustrativeOutcome: '$18,000 -> $51,300-$63,900 over 18 months',
      },
      {
        tier: 'Prime Hospitality Plus',
        minimum: '$42,000',
        duration: '24 months',
        payoutModel: 'Blended occupancy and premium spend split',
        projectedBand: '225% - 305% total cycle',
        illustrativeOutcome: '$42,000 -> $136,500-$170,100 over 24 months',
      },
      {
        tier: 'Executive London Allocation',
        minimum: '$88,000',
        duration: '36 months',
        payoutModel: 'Priority weighted monthly yield participation',
        projectedBand: '270% - 360% total cycle',
        illustrativeOutcome: '$88,000 -> $325,600-$404,800 over 36 months',
      },
    ],
  },
  {
    id: 'kimpton-miralina-paradise-valley',
    title: 'Kimpton Miralina Resort & Villas',
    location: 'Paradise Valley, Arizona, USA',
    tag: 'Resort & Villas Asset',
    summary:
      'A premium resort-style property concept in Paradise Valley positioned for high-value leisure and villa-based yield participation. Trinity structures this as a managed hospitality and villa income lane with monthly distribution logic.',
    imageSrc: '/properties/kimpton-miralina-paradise-valley.jpg',
    imageAlternates: [
      '/properties/kimpton-miralina-resort-villas.jpg',
      '/properties/kimpton-miralina.jpg',
      '/properties/kimpton-miralina-resort-villas-paradise-valley.jpg',
    ],
    imageFallback:
      'Add property image: /public/properties/kimpton-miralina-paradise-valley.jpg',
    facts: [
      { label: 'Address', value: 'Paradise Valley Core District' },
      { label: 'City', value: 'Paradise Valley, AZ' },
      { label: 'Asset Scale', value: 'Resort + villa participation model' },
      { label: 'Income Logic', value: 'Monthly hospitality + villa yield share' },
    ],
    modalTitle: 'Kimpton Miralina Resort & Villas',
    modalLocation: 'Paradise Valley, Arizona, United States',
    overview:
      'Kimpton Miralina Resort & Villas is positioned as a luxury resort and villa-driven hospitality asset with premium seasonal demand characteristics. Trinity presents this property through structured participation tiers tied to monthly operational revenue cycles.',
    highlights: [
      'Luxury resort positioning with villa-led premium inventory',
      'Leisure and high-spend hospitality demand profile',
      'Income mix from rooms, villas, experiences, and F&B operations',
      'Managed monthly reporting and payout flow through Trinity',
    ],
    options: [
      {
        tier: 'Resort Entry Lane',
        minimum: '$6,500',
        duration: '12 months',
        payoutModel: 'Monthly room and villa occupancy share',
        projectedBand: '160% - 225% total cycle',
        illustrativeOutcome: '$6,500 -> $16,900-$21,125 in 12 months',
      },
      {
        tier: 'Premium Villa Pool',
        minimum: '$21,000',
        duration: '18 months',
        payoutModel: 'Monthly blended villa + resort surplus share',
        projectedBand: '195% - 270% total cycle',
        illustrativeOutcome: '$21,000 -> $61,950-$77,700 over 18 months',
      },
      {
        tier: 'Luxury Yield Plus',
        minimum: '$44,000',
        duration: '24 months',
        payoutModel: 'Blended room, villa, and premium service split',
        projectedBand: '235% - 320% total cycle',
        illustrativeOutcome: '$44,000 -> $147,400-$184,800 over 24 months',
      },
      {
        tier: 'Executive Resort Allocation',
        minimum: '$92,000',
        duration: '36 months',
        payoutModel: 'Priority weighted monthly resort-villa participation',
        projectedBand: '280% - 370% total cycle',
        illustrativeOutcome: '$92,000 -> $349,600-$432,400 over 36 months',
      },
    ],
  },
  {
    id: 'park-hyatt-zurich',
    title: 'Park Hyatt Zurich',
    location: 'Zurich, Switzerland',
    tag: 'Prime City-Center Luxury Asset',
    summary:
      'A five-star city-center hospitality asset in Zurich with premium business and leisure demand. Trinity structures this property as a managed revenue participation lane with monthly distribution cycles.',
    imageSrc: '/properties/park-hyatt-zurich.jpg',
    imageAlternates: [
      '/properties/park-hyatt-zurich-switzerland.jpg',
      '/properties/park-hyatt-zurich-hotel.jpg',
      '/properties/zurich-park-hyatt.jpg',
    ],
    imageFallback: 'Add property image: /public/properties/park-hyatt-zurich.jpg',
    facts: [
      { label: 'Address', value: 'Beethovenstrasse 21' },
      { label: 'City', value: '8002 Zurich' },
      { label: 'Asset Scale', value: 'City-center luxury hospitality profile' },
      { label: 'Income Logic', value: 'Monthly room and event revenue participation' },
    ],
    modalTitle: 'Park Hyatt Zurich',
    modalLocation: 'Beethovenstrasse 21, 8002 Zurich, Switzerland',
    overview:
      'Park Hyatt Zurich is a flagship luxury hospitality asset in central Zurich, positioned near the financial district, the lake area, and key convention demand zones. Trinity maps this property into structured buy-in tiers tied to recurring operational performance windows and monthly reporting cycles.',
    highlights: [
      'Prime Zurich city-center location with premium demand profile',
      'Business, events, and leisure occupancy mix',
      'Revenue exposure across rooms, dining, and venue operations',
      'Monthly operational reporting and payout cycle framework',
    ],
    options: [
      {
        tier: 'Zurich Entry Lane',
        minimum: '$8,000',
        duration: '12 months',
        payoutModel: 'Monthly room-revenue participation',
        projectedBand: '155% - 220% total cycle',
        illustrativeOutcome: '$8,000 -> $20,400-$25,600 in 12 months',
      },
      {
        tier: 'City-Center Yield Pool',
        minimum: '$24,000',
        duration: '18 months',
        payoutModel: 'Monthly room + event surplus participation',
        projectedBand: '190% - 265% total cycle',
        illustrativeOutcome: '$24,000 -> $69,600-$87,600 over 18 months',
      },
      {
        tier: 'Executive Hospitality Plus',
        minimum: '$52,000',
        duration: '24 months',
        payoutModel: 'Blended occupancy and premium service split',
        projectedBand: '230% - 315% total cycle',
        illustrativeOutcome: '$52,000 -> $171,600-$215,800 over 24 months',
      },
      {
        tier: 'Institutional Zurich Allocation',
        minimum: '$110,000',
        duration: '36 months',
        payoutModel: 'Priority weighted monthly yield participation',
        projectedBand: '275% - 365% total cycle',
        illustrativeOutcome: '$110,000 -> $412,500-$511,500 over 36 months',
      },
    ],
  },
  {
    id: 'diplomat-beach-resort-hollywood',
    title: 'The Diplomat Beach Resort',
    location: 'Hollywood, Florida, USA',
    tag: 'Coastal Resort Asset',
    summary:
      'A major oceanfront resort property in Hollywood, Florida with strong convention, leisure, and event demand. Trinity structures this asset as a managed participation lane with monthly hospitality-linked distribution cycles.',
    imageSrc: '/properties/diplomat-beach-resort-hollywood.jpg',
    imageAlternates: [
      '/properties/the-diplomat-beach-resort-hollywood.jpg',
      '/properties/diplomat-beach-resort.jpg',
      '/properties/diplomat-hollywood-florida.jpg',
    ],
    imageFallback:
      'Add property image: /public/properties/diplomat-beach-resort-hollywood.jpg',
    facts: [
      { label: 'Address', value: '3555 S Ocean Drive' },
      { label: 'City', value: 'Hollywood, FL 33019' },
      { label: 'Asset Scale', value: 'Large oceanfront resort profile' },
      { label: 'Income Logic', value: 'Monthly rooms + events revenue participation' },
    ],
    modalTitle: 'The Diplomat Beach Resort Hollywood',
    modalLocation: '3555 S Ocean Dr, Hollywood, Florida 33019, United States',
    overview:
      'The Diplomat Beach Resort is a flagship South Florida oceanfront hospitality asset with strong conference, premium leisure, and event-driven demand. Trinity maps this property into structured buy-in tiers tied to monthly operating performance and managed payout windows.',
    highlights: [
      'Prime oceanfront position between Miami and Fort Lauderdale demand zones',
      'Large-scale conference and events revenue exposure with 200k+ sq ft event capacity',
      'Diversified hospitality cash-flow mix across rooms, F&B, and venues',
      'Monthly reporting and distribution model under Trinity oversight',
    ],
    options: [
      {
        tier: 'Coastal Entry Allocation',
        minimum: '$9,000',
        duration: '12 months',
        payoutModel: 'Monthly room-revenue participation',
        projectedBand: '150% - 215% total cycle',
        illustrativeOutcome: '$9,000 -> $22,500-$28,350 in 12 months',
      },
      {
        tier: 'Resort Revenue Pool',
        minimum: '$26,000',
        duration: '18 months',
        payoutModel: 'Monthly room + event surplus participation',
        projectedBand: '185% - 260% total cycle',
        illustrativeOutcome: '$26,000 -> $74,100-$93,600 over 18 months',
      },
      {
        tier: 'Oceanfront Yield Plus',
        minimum: '$58,000',
        duration: '24 months',
        payoutModel: 'Blended occupancy, events, and outlet split',
        projectedBand: '230% - 310% total cycle',
        illustrativeOutcome: '$58,000 -> $191,400-$237,800 over 24 months',
      },
      {
        tier: 'Executive Coastal Allocation',
        minimum: '$120,000',
        duration: '36 months',
        payoutModel: 'Priority weighted monthly yield participation',
        projectedBand: '275% - 360% total cycle',
        illustrativeOutcome: '$120,000 -> $450,000-$552,000 over 36 months',
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
              <PropertyImage
                src={property.imageSrc}
                alternates={property.imageAlternates}
                alt={property.modalTitle}
                fallbackText={property.imageFallback}
              />
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
