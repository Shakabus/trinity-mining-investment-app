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
  {
    id: 'hyatt-regency-greenwich',
    title: 'Hyatt Regency Greenwich',
    location: 'Greenwich, Connecticut, USA',
    tag: 'Business & Events Hospitality Asset',
    summary:
      'A premium Connecticut hospitality asset serving corporate travel, weekend leisure, and event demand. Trinity structures this property as a managed income participation lane with monthly reporting and payout cycles.',
    imageSrc: '/properties/hyatt-regency-greenwich.jpg',
    imageAlternates: [
      '/properties/hyatt-greenwich.jpg',
      '/properties/hyatt-regency-greenwich-connecticut.jpg',
      '/properties/hyatt-regency-old-greenwich.jpg',
    ],
    imageFallback: 'Add property image: /public/properties/hyatt-regency-greenwich.jpg',
    facts: [
      { label: 'Address', value: '1800 E Putnam Avenue' },
      { label: 'City', value: 'Old Greenwich, CT 06870' },
      { label: 'Asset Scale', value: '373-room full-service hotel profile' },
      { label: 'Income Logic', value: 'Monthly rooms + venue revenue participation' },
    ],
    modalTitle: 'Hyatt Regency Greenwich',
    modalLocation: '1800 E Putnam Ave, Old Greenwich, Connecticut 06870, United States',
    overview:
      'Hyatt Regency Greenwich is positioned within a high-income corridor between New York and coastal Connecticut, with reliable demand from corporate stays, private events, and destination travel. Trinity maps this asset into structured buy-in tiers tied to monthly operating performance windows.',
    highlights: [
      'Strategic Greenwich location with strong corporate and commuter demand',
      'Conference and social-event revenue contribution with 35k+ sq ft meeting space',
      'Balanced seasonal profile across business and weekend travel segments',
      'Monthly reporting and payout framework under Trinity management',
    ],
    options: [
      {
        tier: 'Greenwich Entry Allocation',
        minimum: '$8,500',
        duration: '12 months',
        payoutModel: 'Monthly room-revenue participation',
        projectedBand: '145% - 205% total cycle',
        illustrativeOutcome: '$8,500 -> $20,825-$25,925 in 12 months',
      },
      {
        tier: 'Corporate Yield Pool',
        minimum: '$25,000',
        duration: '18 months',
        payoutModel: 'Monthly room + events surplus participation',
        projectedBand: '180% - 255% total cycle',
        illustrativeOutcome: '$25,000 -> $70,000-$88,750 over 18 months',
      },
      {
        tier: 'Regency Performance Plus',
        minimum: '$54,000',
        duration: '24 months',
        payoutModel: 'Blended occupancy and venue revenue split',
        projectedBand: '225% - 305% total cycle',
        illustrativeOutcome: '$54,000 -> $175,500-$218,700 over 24 months',
      },
      {
        tier: 'Institutional Greenwich Allocation',
        minimum: '$115,000',
        duration: '36 months',
        payoutModel: 'Priority weighted monthly yield participation',
        projectedBand: '270% - 355% total cycle',
        illustrativeOutcome: '$115,000 -> $425,500-$523,250 over 36 months',
      },
    ],
  },
  {
    id: 'ritz-carlton-las-colinas',
    title: 'The Ritz-Carlton Dallas, Las Colinas',
    location: 'Irving, Texas, USA',
    tag: 'Luxury Resort & Golf Asset',
    summary:
      'A premium resort and golf hospitality asset in Las Colinas with strong corporate, leisure, and event demand. Trinity structures this property as a managed participation lane with monthly performance-linked distributions.',
    imageSrc: '/properties/ritz-carlton-las-colinas.jpg',
    imageAlternates: [
      '/properties/the-ritz-carlton-dallas-las-colinas.jpg',
      '/properties/ritz-carlton-dallas-las-colinas.jpg',
      '/properties/ritz-carlton-irving-texas.jpg',
    ],
    imageFallback: 'Add property image: /public/properties/ritz-carlton-las-colinas.jpg',
    facts: [
      { label: 'Address', value: '4150 N MacArthur Boulevard' },
      { label: 'City', value: 'Irving, TX 75038' },
      { label: 'Asset Scale', value: '431-room luxury resort profile' },
      { label: 'Income Logic', value: 'Monthly rooms + events + resort spend participation' },
    ],
    modalTitle: 'The Ritz-Carlton Dallas, Las Colinas',
    modalLocation: '4150 N MacArthur Blvd, Irving, Texas 75038, United States',
    overview:
      'The Ritz-Carlton Dallas, Las Colinas is a large-format luxury resort asset positioned in the Dallas-Fort Worth corridor. Trinity presents this property through structured buy-in tiers connected to monthly hospitality performance cycles across rooms, events, and resort-led spend.',
    highlights: [
      'Strategic Las Colinas location near major DFW business corridors',
      '431-key luxury resort profile with meetings and events demand',
      'Diversified operating mix across rooms, F&B, and resort amenities',
      'Monthly reporting and distribution framework under Trinity oversight',
    ],
    options: [
      {
        tier: 'Las Colinas Entry Allocation',
        minimum: '$9,500',
        duration: '12 months',
        payoutModel: 'Monthly room-revenue participation',
        projectedBand: '150% - 215% total cycle',
        illustrativeOutcome: '$9,500 -> $23,750-$30,425 in 12 months',
      },
      {
        tier: 'Resort Revenue Pool',
        minimum: '$28,000',
        duration: '18 months',
        payoutModel: 'Monthly room + event surplus participation',
        projectedBand: '185% - 260% total cycle',
        illustrativeOutcome: '$28,000 -> $79,800-$100,800 over 18 months',
      },
      {
        tier: 'Executive Resort Plus',
        minimum: '$62,000',
        duration: '24 months',
        payoutModel: 'Blended occupancy, events, and resort spend split',
        projectedBand: '230% - 315% total cycle',
        illustrativeOutcome: '$62,000 -> $204,600-$257,300 over 24 months',
      },
      {
        tier: 'Institutional DFW Allocation',
        minimum: '$130,000',
        duration: '36 months',
        payoutModel: 'Priority weighted monthly yield participation',
        projectedBand: '275% - 365% total cycle',
        illustrativeOutcome: '$130,000 -> $487,500-$604,500 over 36 months',
      },
    ],
  },
  {
    id: 'grand-hyatt-indian-wells',
    title: 'Grand Hyatt Indian Wells Resort & Villas',
    location: 'Indian Wells, California, USA',
    tag: 'Resort Villas & Leisure Asset',
    summary:
      'A large-format Palm Springs area resort with strong leisure, events, and villa-driven demand. Trinity structures this property as a managed participation lane with monthly operational reporting and payout cycles.',
    imageSrc: '/properties/grand-hyatt-indian-wells.jpg',
    imageAlternates: [
      '/properties/grand-hyatt-indian-wells-resort-villas.jpg',
      '/properties/hyatt-indian-wells.jpg',
      '/properties/indian-wells-grand-hyatt.jpg',
    ],
    imageFallback: 'Add property image: /public/properties/grand-hyatt-indian-wells.jpg',
    facts: [
      { label: 'Address', value: '44600 Indian Wells Lane' },
      { label: 'City', value: 'Indian Wells, CA 92210' },
      { label: 'Asset Scale', value: '531 rooms including suites and villas' },
      { label: 'Income Logic', value: 'Monthly rooms + resort + villas revenue participation' },
    ],
    modalTitle: 'Grand Hyatt Indian Wells Resort & Villas',
    modalLocation: '44600 Indian Wells Ln, Indian Wells, California 92210, United States',
    overview:
      'Grand Hyatt Indian Wells is a high-capacity destination resort in Greater Palm Springs with demand across family leisure, premium villa stays, events, and group travel. Trinity maps this asset into structured buy-in tiers linked to recurring monthly performance windows.',
    highlights: [
      'Large-scale resort profile with 531 rooms, suites, and villas',
      'Strong leisure and group travel demand in the Greater Palm Springs corridor',
      'Diversified operating mix across rooms, villas, F&B, and resort experiences',
      'Managed monthly reporting and distribution framework under Trinity oversight',
    ],
    options: [
      {
        tier: 'Desert Entry Allocation',
        minimum: '$8,000',
        duration: '12 months',
        payoutModel: 'Monthly room-revenue participation',
        projectedBand: '145% - 205% total cycle',
        illustrativeOutcome: '$8,000 -> $19,600-$24,400 in 12 months',
      },
      {
        tier: 'Resort & Villas Yield Pool',
        minimum: '$24,500',
        duration: '18 months',
        payoutModel: 'Monthly room + villas surplus participation',
        projectedBand: '180% - 255% total cycle',
        illustrativeOutcome: '$24,500 -> $68,600-$86,975 over 18 months',
      },
      {
        tier: 'Palm Springs Performance Plus',
        minimum: '$56,000',
        duration: '24 months',
        payoutModel: 'Blended occupancy, villas, and resort spend split',
        projectedBand: '225% - 310% total cycle',
        illustrativeOutcome: '$56,000 -> $182,000-$229,600 over 24 months',
      },
      {
        tier: 'Institutional Desert Allocation',
        minimum: '$125,000',
        duration: '36 months',
        payoutModel: 'Priority weighted monthly yield participation',
        projectedBand: '270% - 355% total cycle',
        illustrativeOutcome: '$125,000 -> $462,500-$568,750 over 36 months',
      },
    ],
  },
  {
    id: 'omni-san-diego',
    title: 'Omni San Diego Hotel',
    location: 'San Diego, California, USA',
    tag: 'Convention & Ballpark Hospitality Asset',
    summary:
      'A high-traffic downtown hospitality asset connected to Petco Park and near the convention corridor. Trinity structures this property as a managed participation lane with monthly performance reporting and payout cycles.',
    imageSrc: '/properties/omni-san-diego.jpg',
    imageAlternates: [
      '/properties/omni-san-diego-hotel.jpg',
      '/properties/omni-san-diego-ballpark.jpg',
      '/properties/omni-hotel-san-diego.jpg',
    ],
    imageFallback: 'Add property image: /public/properties/omni-san-diego.jpg',
    facts: [
      { label: 'Address', value: '675 L Street' },
      { label: 'City', value: 'San Diego, CA 92101' },
      { label: 'Asset Scale', value: '511-room downtown hotel profile' },
      { label: 'Income Logic', value: 'Monthly rooms + events revenue participation' },
    ],
    modalTitle: 'Omni San Diego Hotel',
    modalLocation: '675 L St, San Diego, California 92101, United States',
    overview:
      'Omni San Diego is a major downtown hospitality asset with strong occupancy drivers from conventions, events, ballpark activity, and tourism demand in the Gaslamp corridor. Trinity maps this property into structured buy-in tiers linked to recurring monthly operating windows.',
    highlights: [
      'Prime downtown location near the San Diego Convention Center',
      '511-room profile with consistent conference and event demand',
      'Diversified operating mix across rooms, events, and food-and-beverage outlets',
      'Managed monthly reporting and distribution framework under Trinity oversight',
    ],
    options: [
      {
        tier: 'Downtown Entry Allocation',
        minimum: '$8,500',
        duration: '12 months',
        payoutModel: 'Monthly room-revenue participation',
        projectedBand: '145% - 205% total cycle',
        illustrativeOutcome: '$8,500 -> $20,825-$25,925 in 12 months',
      },
      {
        tier: 'Convention Yield Pool',
        minimum: '$26,000',
        duration: '18 months',
        payoutModel: 'Monthly room + event surplus participation',
        projectedBand: '180% - 255% total cycle',
        illustrativeOutcome: '$26,000 -> $72,800-$92,300 over 18 months',
      },
      {
        tier: 'Ballpark Performance Plus',
        minimum: '$57,500',
        duration: '24 months',
        payoutModel: 'Blended occupancy, event, and outlet revenue split',
        projectedBand: '225% - 310% total cycle',
        illustrativeOutcome: '$57,500 -> $186,875-$235,750 over 24 months',
      },
      {
        tier: 'Institutional Downtown Allocation',
        minimum: '$128,000',
        duration: '36 months',
        payoutModel: 'Priority weighted monthly yield participation',
        projectedBand: '270% - 355% total cycle',
        illustrativeOutcome: '$128,000 -> $473,600-$582,400 over 36 months',
      },
    ],
  },
  {
    id: 'w-hollywood-los-angeles',
    title: 'W Hollywood',
    location: 'Los Angeles, California, USA',
    tag: 'Urban Lifestyle Hospitality Asset',
    summary:
      'A high-visibility Hollywood hospitality asset positioned for entertainment, business travel, and premium leisure demand. Trinity structures this property as a managed participation lane with monthly performance-linked distributions.',
    imageSrc: '/properties/w-hollywood-los-angeles.jpg',
    imageAlternates: [
      '/properties/w-hollywood.jpg',
      '/properties/w-hotel-hollywood.jpg',
      '/properties/w-hollywood-california.jpg',
    ],
    imageFallback: 'Add property image: /public/properties/w-hollywood-los-angeles.jpg',
    facts: [
      { label: 'Address', value: '6250 Hollywood Boulevard' },
      { label: 'City', value: 'Los Angeles, CA 90028' },
      { label: 'Asset Scale', value: '319-room urban lifestyle hotel profile' },
      { label: 'Income Logic', value: 'Monthly rooms + events + venue revenue participation' },
    ],
    modalTitle: 'W Hollywood, Los Angeles',
    modalLocation: '6250 Hollywood Blvd, Los Angeles, California 90028, United States',
    overview:
      'W Hollywood is an anchor hospitality asset in one of Los Angeles most active entertainment corridors. Trinity maps this property into structured buy-in tiers tied to recurring monthly operating windows across rooms, events, and high-traffic venue activity.',
    highlights: [
      'Prime Hollywood location with strong entertainment and tourism demand',
      'Urban lifestyle profile with event and premium-nightstay exposure',
      'Diversified operating mix across rooms, venues, and food-and-beverage outlets',
      'Managed monthly reporting and distribution framework under Trinity oversight',
    ],
    options: [
      {
        tier: 'Hollywood Entry Allocation',
        minimum: '$9,000',
        duration: '12 months',
        payoutModel: 'Monthly room-revenue participation',
        projectedBand: '150% - 210% total cycle',
        illustrativeOutcome: '$9,000 -> $22,500-$27,900 in 12 months',
      },
      {
        tier: 'Lifestyle Yield Pool',
        minimum: '$27,500',
        duration: '18 months',
        payoutModel: 'Monthly room + events surplus participation',
        projectedBand: '185% - 260% total cycle',
        illustrativeOutcome: '$27,500 -> $79,750-$99,000 over 18 months',
      },
      {
        tier: 'Urban Performance Plus',
        minimum: '$60,000',
        duration: '24 months',
        payoutModel: 'Blended occupancy, events, and venue spend split',
        projectedBand: '230% - 315% total cycle',
        illustrativeOutcome: '$60,000 -> $198,000-$249,000 over 24 months',
      },
      {
        tier: 'Institutional Hollywood Allocation',
        minimum: '$132,000',
        duration: '36 months',
        payoutModel: 'Priority weighted monthly yield participation',
        projectedBand: '275% - 360% total cycle',
        illustrativeOutcome: '$132,000 -> $495,000-$607,200 over 36 months',
      },
    ],
  },
  {
    id: 'grande-lakes-orlando-jw-ritz',
    title: 'Grande Lakes Orlando (JW Marriott & Ritz-Carlton)',
    location: 'Orlando, Florida, USA',
    tag: 'Dual-Brand Resort Mega Asset',
    summary:
      'A large integrated resort complex combining JW Marriott and The Ritz-Carlton at Grande Lakes. Trinity structures this as a managed participation lane linked to monthly performance across rooms, events, golf, and resort experiences.',
    imageSrc: '/properties/grande-lakes-orlando.jpg',
    imageAlternates: [
      '/properties/grande-lakes-orlando-jw-marriott-ritz-carlton.jpg',
      '/properties/jw-marriott-ritz-carlton-grande-lakes.jpg',
      '/properties/ritz-carlton-orlando-grande-lakes.jpg',
      '/properties/jw-marriott-orlando-grande-lakes.jpg',
    ],
    imageFallback: 'Add property image: /public/properties/grande-lakes-orlando.jpg',
    facts: [
      { label: 'Address', value: '4040 Central Florida Parkway' },
      { label: 'City', value: 'Orlando, FL 32837' },
      { label: 'Asset Scale', value: '1,500+ key dual-brand resort footprint' },
      { label: 'Income Logic', value: 'Monthly rooms + events + resort revenue participation' },
    ],
    modalTitle: 'Grande Lakes Orlando (JW Marriott & The Ritz-Carlton)',
    modalLocation: '4040 Central Florida Pkwy, Orlando, Florida 32837, United States',
    overview:
      'Grande Lakes Orlando is a large-scale luxury hospitality ecosystem anchored by JW Marriott and The Ritz-Carlton. Trinity maps this asset into structured buy-in tiers linked to recurring monthly operating windows across room demand, conferences, leisure traffic, golf programming, and premium resort spend.',
    highlights: [
      'Dual-brand luxury positioning with large combined key count',
      'Strong conference, family-leisure, and destination event demand',
      'Diversified operating mix across rooms, F&B, events, and resort amenities',
      'Managed monthly reporting and distribution framework under Trinity oversight',
    ],
    options: [
      {
        tier: 'Grande Lakes Entry Allocation',
        minimum: '$10,000',
        duration: '12 months',
        payoutModel: 'Monthly room-revenue participation',
        projectedBand: '150% - 215% total cycle',
        illustrativeOutcome: '$10,000 -> $25,000-$31,500 in 12 months',
      },
      {
        tier: 'Dual-Brand Yield Pool',
        minimum: '$30,000',
        duration: '18 months',
        payoutModel: 'Monthly room + event surplus participation',
        projectedBand: '190% - 265% total cycle',
        illustrativeOutcome: '$30,000 -> $87,000-$109,500 over 18 months',
      },
      {
        tier: 'Resort Performance Plus',
        minimum: '$66,000',
        duration: '24 months',
        payoutModel: 'Blended occupancy, events, and amenity spend split',
        projectedBand: '235% - 320% total cycle',
        illustrativeOutcome: '$66,000 -> $221,100-$277,200 over 24 months',
      },
      {
        tier: 'Institutional Orlando Allocation',
        minimum: '$145,000',
        duration: '36 months',
        payoutModel: 'Priority weighted monthly yield participation',
        projectedBand: '280% - 365% total cycle',
        illustrativeOutcome: '$145,000 -> $551,000-$674,250 over 36 months',
      },
    ],
  },
  {
    id: 'westin-maui-kaanapali',
    title: "The Westin Maui Resort & Spa, Ka'anapali",
    location: 'Maui, Hawaii, USA',
    tag: 'Oceanfront Resort Asset',
    summary:
      'A premier oceanfront resort in Kaanapali with strong leisure demand, premium room categories, and destination-driven occupancy. Trinity structures this property as a managed participation lane with monthly performance reporting and payout cycles.',
    imageSrc: '/properties/westin-maui-kaanapali.jpg',
    imageAlternates: [
      '/properties/westin-maui-resort-spa-kaanapali.jpg',
      '/properties/the-westin-maui-resort-spa.jpg',
      '/properties/westin-kaanapali-maui.jpg',
    ],
    imageFallback: 'Add property image: /public/properties/westin-maui-kaanapali.jpg',
    facts: [
      { label: 'Address', value: '2365 Kaanapali Parkway' },
      { label: 'City', value: 'Lahaina, HI 96761' },
      { label: 'Asset Scale', value: '750+ room oceanfront resort profile' },
      { label: 'Income Logic', value: 'Monthly rooms + resort + activities participation' },
    ],
    modalTitle: "The Westin Maui Resort & Spa, Ka'anapali",
    modalLocation: '2365 Kaanapali Pkwy, Lahaina, Hawaii 96761, United States',
    overview:
      'The Westin Maui Resort and Spa, Kaanapali is a flagship Hawaii hospitality asset with strong seasonal leisure demand, premium oceanfront positioning, and high ancillary spend potential. Trinity maps this property into structured buy-in tiers tied to recurring monthly operating windows.',
    highlights: [
      'Prime Ka anapali beachfront positioning with high tourism demand',
      'Large-scale resort profile with diversified room mix',
      'Revenue exposure across rooms, dining, experiences, and resort amenities',
      'Managed monthly reporting and distribution framework under Trinity oversight',
    ],
    options: [
      {
        tier: 'Hawaii Entry Allocation',
        minimum: '$9,500',
        duration: '12 months',
        payoutModel: 'Monthly room-revenue participation',
        projectedBand: '150% - 215% total cycle',
        illustrativeOutcome: '$9,500 -> $23,750-$29,925 in 12 months',
      },
      {
        tier: 'Oceanfront Yield Pool',
        minimum: '$29,000',
        duration: '18 months',
        payoutModel: 'Monthly room + resort surplus participation',
        projectedBand: '190% - 265% total cycle',
        illustrativeOutcome: '$29,000 -> $84,100-$105,850 over 18 months',
      },
      {
        tier: 'Resort Performance Plus',
        minimum: '$64,000',
        duration: '24 months',
        payoutModel: 'Blended occupancy, amenities, and outlet revenue split',
        projectedBand: '235% - 320% total cycle',
        illustrativeOutcome: '$64,000 -> $214,400-$268,800 over 24 months',
      },
      {
        tier: 'Institutional Maui Allocation',
        minimum: '$138,000',
        duration: '36 months',
        payoutModel: 'Priority weighted monthly yield participation',
        projectedBand: '280% - 365% total cycle',
        illustrativeOutcome: '$138,000 -> $524,400-$641,700 over 36 months',
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
