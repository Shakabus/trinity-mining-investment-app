import BitryxHeader from '@/components/marketing/BitryxHeader'
import MarketingFooter from '@/components/marketing/MarketingFooter'

export default function RealEstatePortfolioPage() {
  return (
    <div className="min-h-screen bg-black text-white marketing-page">
      <div className="marketing-page-content">
        <div className="mx-auto w-full max-w-6xl px-6 pt-6">
          <BitryxHeader />
        </div>

        <main className="mx-auto w-full max-w-6xl px-6 pb-12 pt-28">
          <section className="w-full py-16 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
              Real Estate Portfolio
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-6xl">
              Property-Backed Growth Layer
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-sm text-white/70 md:text-base">
              Explore Trinity in One real-estate exposure across strategic
              regions with infrastructure-first operations, disciplined
              portfolio management, and transparent long-cycle reporting.
            </p>
          </section>
        </main>
      </div>

      <MarketingFooter />
    </div>
  )
}
