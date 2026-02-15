import BitryxHeader from '@/components/marketing/BitryxHeader'
import MarketingFooter from '@/components/marketing/MarketingFooter'
import LivePaymentsPageClient from '@/components/marketing/LivePaymentsPageClient'

export const dynamic = 'force-dynamic'

export default function LivePaymentsPage() {
  return (
    <div className="min-h-screen bg-black text-white marketing-page">
      <div className="marketing-page-content">
        <div className="mx-auto w-full max-w-6xl px-6 pt-6">
          <BitryxHeader />
        </div>
        <main className="pt-28 md:pt-32">
          <LivePaymentsPageClient />
        </main>
        <MarketingFooter />
      </div>
    </div>
  )
}

