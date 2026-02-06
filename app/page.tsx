import Link from 'next/link'
import BitryxHeader from '@/components/marketing/BitryxHeader'
import HeroLottie from '@/components/marketing/HeroLottie'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-6xl px-6 pt-6">
        <BitryxHeader />
      </div>

      <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-28">
        <section className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-white/70">
            A Stable Mining Platform
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-6xl">
            To Maximize Profitability
          </h1>
          <p className="mt-4 text-sm text-white/70 md:text-base">
            Join the revolution in cloud-based mining with high yields and zero
            hardware hassle. Mine crypto effortlessly with Trinity In One- power
            your future today
          </p>
        </section>

        <div className="mt-10">
          <HeroLottie />
        </div>
      </main>
    </div>
  )
}
