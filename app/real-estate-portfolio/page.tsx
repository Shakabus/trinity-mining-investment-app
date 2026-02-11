import BitryxHeader from '@/components/marketing/BitryxHeader'
import MarketingFooter from '@/components/marketing/MarketingFooter'
import RealEstatePropertySpotlight from '@/components/marketing/RealEstatePropertySpotlight'
import { getRealEstatePropertySpotlightItems } from '@/lib/real-estate-property-spotlight'

const PARTICIPATION_MODELS = [
  {
    title: 'Residential Income Access',
    text: 'Participate in 1-bedroom and 2-bedroom condo style assets through structured buy-in or managed rental exposure models with monthly performance visibility.',
  },
  {
    title: 'Hospitality Revenue Participation',
    text: 'Access hotel and resort income structures where investor returns are linked to operating performance, occupancy cycles, and defined payout percentages.',
  },
  {
    title: 'Complex And Villa Allocation',
    text: 'Deploy capital into apartment complexes and villa categories using duration-based participation windows built for recurring passive income outcomes.',
  },
]

const WHY_THIS_LAYER = [
  'Unified with mining and trading under one account environment',
  'Clear participation logic for buy-in and rental-based exposure',
  'Monthly income tracking with transparent reporting structure',
  'Multi-category property options for diversified allocation planning',
]

export default async function RealEstatePortfolioPage() {
  const spotlightProperties = await getRealEstatePropertySpotlightItems()

  return (
    <div className="min-h-screen bg-black text-white marketing-page">
      <div className="marketing-page-content">
        <div className="mx-auto w-full max-w-6xl px-6 pt-6">
          <BitryxHeader />
        </div>

        <main className="mx-auto w-full max-w-6xl px-6 pb-14 pt-28">
          <section className="w-full rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.11] to-white/[0.03] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.45)] md:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
              Real Estate Portfolio
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
              Property-Backed Investment Built Into Trinity in One
            </h1>
            <p className="mt-6 max-w-4xl text-sm leading-7 text-white/78 md:text-base">
              Trinity in One Real Estate Portfolio is a structured property-investment
              layer connected to our mining and managed trading ecosystem. The goal is to
              give users and investors access to real-estate income opportunities through a
              transparent participation model, clear duration windows, and consistent monthly
              reporting from one unified platform.
            </p>
            <div className="mt-8 grid gap-3 md:grid-cols-2">
              {WHY_THIS_LAYER.map(point => (
                <article
                  key={point}
                  className="rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white/82"
                >
                  {point}
                </article>
              ))}
            </div>
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-3">
            {PARTICIPATION_MODELS.map(model => (
              <article
                key={model.title}
                className="rounded-2xl border border-white/12 bg-gradient-to-br from-white/[0.1] to-white/[0.02] p-6 shadow-[0_8px_28px_rgba(0,0,0,0.35)]"
              >
                <h2 className="text-xl font-semibold text-white">{model.title}</h2>
                <p className="mt-3 text-sm leading-7 text-white/78">{model.text}</p>
              </article>
            ))}
          </section>

          <section className="mt-8 rounded-2xl border border-white/12 bg-white/[0.03] p-6 md:p-8">
            <h2 className="text-2xl font-semibold text-white md:text-3xl">
              How This Portfolio Will Be Presented
            </h2>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-white/78 md:text-base">
              Properties will be listed by category and offering model, including residential
              units, apartment complexes, hotels, resorts, and villas. Each listing will include
              participation format, duration options, and projected monthly income structure so
              users can compare opportunities with clarity before entering a position.
            </p>
          </section>

          <RealEstatePropertySpotlight properties={spotlightProperties} />
        </main>
      </div>

      <MarketingFooter />
    </div>
  )
}
