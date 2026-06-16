import BitryxHeader from '@/components/marketing/BitryxHeader'
import MarketingFooter from '@/components/marketing/MarketingFooter'
import ContactPageClient from '@/components/marketing/ContactPageClient'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-black text-white marketing-page">
      <div className="marketing-page-content">
        <div className="mx-auto w-full max-w-6xl px-6 pt-6">
          <BitryxHeader />
        </div>

        <main className="mx-auto w-full max-w-6xl px-6 pb-12 pt-28">
          <ContactPageClient />
        </main>
      </div>

      <MarketingFooter />
    </div>
  )
}
