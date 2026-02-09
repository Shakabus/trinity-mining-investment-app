import BitryxHeader from '@/components/marketing/BitryxHeader'
import MarketingFooter from '@/components/marketing/MarketingFooter'
import TrinityFlowTimeline from '@/components/marketing/TrinityFlowTimeline'
import InteractiveKnowledgeHub from '@/components/marketing/InteractiveKnowledgeHub'
import MiningInvestmentFramework from '@/components/marketing/MiningInvestmentFramework'
import HowFlowHighlightLottieSection from '@/components/marketing/HowFlowHighlightLottieSection'
import MiningPlansSection from '@/components/marketing/MiningPlansSection'
import InvestmentTradingPlansSection from '@/components/marketing/InvestmentTradingPlansSection'
import HowItWorksFaqSection from '@/components/marketing/HowItWorksFaqSection'

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-6xl px-6 pt-6">
        <BitryxHeader />
      </div>
      <main className="mx-auto w-full max-w-5xl px-6 pb-12 pt-28">
        <section className="w-full py-16 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
            How It Works
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-6xl">
            Trinity in One
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-sm text-white/70 md:text-base">
            Understand the complete flow from activation to monitored performance and payout.
          </p>
        </section>

        <TrinityFlowTimeline />
        <HowFlowHighlightLottieSection />
        <InteractiveKnowledgeHub />
        <MiningInvestmentFramework />
        <InvestmentTradingPlansSection />
        <MiningPlansSection />
        <HowItWorksFaqSection />
      </main>
      <MarketingFooter />
    </div>
  )
}
