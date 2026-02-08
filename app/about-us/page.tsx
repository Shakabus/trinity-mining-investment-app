import BitryxHeader from '@/components/marketing/BitryxHeader'
import MarketingFooter from '@/components/marketing/MarketingFooter'

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-6xl px-6 pt-6">
        <BitryxHeader />
      </div>
      <main className="mx-auto flex w-full max-w-5xl px-6 pb-24 pt-28">
        <section className="w-full py-20 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
            About Us
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-6xl">
            Trinity in One
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-sm text-white/70 md:text-base">
            We build transparent mining and investment systems designed for steady, structured growth.
          </p>
        </section>
      </main>
      <MarketingFooter />
    </div>
  )
}
