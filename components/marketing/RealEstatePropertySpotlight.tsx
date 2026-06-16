'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import styles from '@/components/marketing/RealEstatePropertySpotlight.module.css'
import { REAL_ESTATE_PROPERTIES, type BuyInOption, type PropertyItem } from '@/lib/real-estate-property-catalog'

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

type RealEstatePropertySpotlightProps = {
  buyInLabel?: string
  enableBuyInFlow?: boolean
  properties?: PropertyItem[]
}

export default function RealEstatePropertySpotlight({
  buyInLabel = 'Buy In From Dashboard',
  enableBuyInFlow = false,
  properties,
}: RealEstatePropertySpotlightProps) {
  const router = useRouter()
  const [openId, setOpenId] = useState<string | null>(null)
  const catalog = properties && properties.length > 0 ? properties : REAL_ESTATE_PROPERTIES

  const openProperty = useMemo(
    () => catalog.find(property => property.id === openId) ?? null,
    [catalog, openId],
  )

  const buildBuyInHref = (property: PropertyItem, option: BuyInOption) => {
    const params = new URLSearchParams({
      propertyId: property.id,
      title: property.modalTitle,
      location: property.modalLocation,
      tier: option.tier,
      minimum: option.minimum,
      duration: option.duration,
      payoutModel: option.payoutModel,
      projectedBand: option.projectedBand,
      illustrativeOutcome: option.illustrativeOutcome,
    })

    return '/dashboard/real-estate/payment?' + params.toString()
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Featured Assets Under Management</h2>
      <p className={styles.subheading}>
        Property spotlights are presented with summary, operational profile, and
        structured buy-in tiers so users can compare participation paths before
        entering the dashboard purchase flow.
      </p>

      <div className={styles.cards}>
        {catalog.map(property => (
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
                <Link href={enableBuyInFlow ? '#' : '/dashboard/real-estate'} className={styles.btnPrimary} onClick={event => { if (enableBuyInFlow) { event.preventDefault(); setOpenId(property.id) } }}>
                  {buyInLabel}
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
                      {enableBuyInFlow && <th>Action</th>}
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
                        {enableBuyInFlow && (
                          <td>
                            <button
                              type="button"
                              className={`${styles.btnPrimary} ${styles.optionActionButton}`}
                              onClick={() => router.push(buildBuyInHref(openProperty, option))}
                            >
                              Buy This Tier
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>


              <div className={styles.modalActions}>
                {!enableBuyInFlow && (
                  <Link href="/dashboard/real-estate" className={styles.btnPrimary}>
                    Continue To Buy-In Flow
                  </Link>
                )}
                {enableBuyInFlow && <p className={styles.flowHint}>Select a buy-in tier above to continue to payment instructions.</p>}
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




