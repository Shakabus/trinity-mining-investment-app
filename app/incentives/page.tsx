import BitryxHeader from '@/components/marketing/BitryxHeader'

export default function IncentivesPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-6xl px-6 pt-6">
        <BitryxHeader />
      </div>
      <main className="mx-auto w-full max-w-5xl px-6 pb-12 pt-28">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-10 backdrop-blur-2xl">
          <h1 className="text-3xl font-semibold">Incentives</h1>
          <p className="mt-4 text-sm text-white/70">
            Earn referral rewards, unlock higher allocation tiers, and qualify
            for faster payout windows as your portfolio grows.
          </p>
          <p className="mt-4 text-sm text-white/70">
            Incentives are tied to verified payments and managed risk thresholds
            to keep returns sustainable.
          </p>
        </div>
      </main>
    </div>
  )
}
