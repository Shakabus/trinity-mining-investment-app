import BitryxHeader from '@/components/marketing/BitryxHeader'

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-6xl px-6 pt-6">
        <BitryxHeader />
      </div>
      <main className="mx-auto w-full max-w-5xl px-6 pb-24 pt-28">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-10 backdrop-blur-2xl">
          <h1 className="text-3xl font-semibold">About Bitryx</h1>
          <p className="mt-4 text-sm text-white/70">
            Bitryx combines enterprise-grade mining operations with managed
            multi-asset portfolio strategies, built for transparency and
            long-term capital preservation.
          </p>
          <p className="mt-4 text-sm text-white/70">
            Every plan is verified by internal monitoring, documented payout
            workflows, and risk controls that prioritize stability before
            scaling exposure.
          </p>
        </div>
      </main>
    </div>
  )
}
