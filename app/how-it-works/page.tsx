import BitryxHeader from '@/components/marketing/BitryxHeader'

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-6xl px-6 pt-6">
        <BitryxHeader />
      </div>
      <main className="mx-auto w-full max-w-5xl px-6 pb-24 pt-12">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-10 backdrop-blur-2xl">
          <h1 className="text-3xl font-semibold">How It Works</h1>
          <ol className="mt-6 space-y-4 text-sm text-white/70">
            <li>Select a plan and submit payment proof to begin onboarding.</li>
            <li>Admins verify payment before activation and monitoring begins.</li>
            <li>Track performance in your dashboard and request withdrawals once the plan completes.</li>
          </ol>
        </div>
      </main>
    </div>
  )
}
