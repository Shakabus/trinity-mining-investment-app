import BitryxHeader from '@/components/marketing/BitryxHeader'

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-6xl px-6 pt-6">
        <BitryxHeader />
      </div>
      <main className="mx-auto w-full max-w-5xl px-6 pb-12 pt-28">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-10 backdrop-blur-2xl">
          <h1 className="text-3xl font-semibold">Features</h1>
          <ul className="mt-6 space-y-4 text-sm text-white/70">
            <li>Real-time plan tracking for mining and trading allocations.</li>
            <li>Proof-based payment verification with admin approval flows.</li>
            <li>Dynamic dashboards for earnings, activity, and withdrawals.</li>
            <li>Multi-currency display with USD-based accounting.</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
