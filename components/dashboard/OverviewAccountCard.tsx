'use client'

import Link from 'next/link'
import { ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react'
import { useMemo, useState } from 'react'

type MetricTone = 'emerald' | 'blue' | 'violet' | 'rose' | 'cyan' | 'stone' | 'neutral'

export interface OverviewAccountMetric {
  label: string
  value: string
  tone?: MetricTone
}

export interface OverviewWalletFlowMetric {
  coin: string
  netCrypto: string
  netUsd: string
  totalInCrypto: string
  totalOutCrypto: string
}

interface OverviewAccountCardProps {
  accountBalance: string
  availableForPlans: string
  withdrawableEarnings: string
  pendingCredits?: string | null
  pendingPurchaseDebits?: string | null
  pendingWithdrawals?: string | null
  detailMetrics: OverviewAccountMetric[]
  walletFlowMetrics: OverviewWalletFlowMetric[]
}

const toneStyles: Record<MetricTone, { background: string; border: string; text: string; subText: string }> = {
  emerald: {
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.06))',
    border: '1px solid rgba(16, 185, 129, 0.35)',
    text: '#a7f3d0',
    subText: 'rgba(167, 243, 208, 0.75)',
  },
  blue: {
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.06))',
    border: '1px solid rgba(59, 130, 246, 0.35)',
    text: '#bfdbfe',
    subText: 'rgba(191, 219, 254, 0.75)',
  },
  violet: {
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.22), rgba(139, 92, 246, 0.07))',
    border: '1px solid rgba(139, 92, 246, 0.35)',
    text: '#ddd6fe',
    subText: 'rgba(221, 214, 254, 0.75)',
  },
  rose: {
    background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.22), rgba(244, 63, 94, 0.07))',
    border: '1px solid rgba(244, 63, 94, 0.35)',
    text: '#fecdd3',
    subText: 'rgba(254, 205, 211, 0.75)',
  },
  cyan: {
    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.22), rgba(6, 182, 212, 0.07))',
    border: '1px solid rgba(6, 182, 212, 0.35)',
    text: '#a5f3fc',
    subText: 'rgba(165, 243, 252, 0.75)',
  },
  stone: {
    background: 'linear-gradient(135deg, rgba(120, 113, 108, 0.22), rgba(120, 113, 108, 0.07))',
    border: '1px solid rgba(168, 162, 158, 0.35)',
    text: '#e7e5e4',
    subText: 'rgba(231, 229, 228, 0.75)',
  },
  neutral: {
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04))',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    text: '#ffffff',
    subText: 'rgba(255, 255, 255, 0.75)',
  },
}

export default function OverviewAccountCard({
  accountBalance,
  availableForPlans,
  withdrawableEarnings,
  pendingCredits,
  pendingPurchaseDebits,
  pendingWithdrawals,
  detailMetrics,
  walletFlowMetrics,
}: OverviewAccountCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isBalanceHidden, setIsBalanceHidden] = useState(false)

  const maskedBalance = useMemo(() => {
    if (!isBalanceHidden) return accountBalance
    return '********'
  }, [accountBalance, isBalanceHidden])

  return (
    <section
      className="rounded-3xl p-5 md:p-6"
      style={{
        background: 'linear-gradient(135deg, rgba(16, 23, 42, 0.88), rgba(30, 41, 59, 0.62))',
        border: '1px solid rgba(148, 163, 184, 0.35)',
        boxShadow: '0 16px 44px rgba(2, 6, 23, 0.45)',
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-white">Account Information</h2>
          <p className="text-xs text-slate-300/80 mt-1">Combined wallet asset value (live crypto conversion)</p>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(previous => !previous)}
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs md:text-sm font-semibold text-white transition hover:scale-[1.02]"
          style={{
            background: 'linear-gradient(135deg, rgba(71, 85, 105, 0.65), rgba(30, 41, 59, 0.65))',
            border: '1px solid rgba(148, 163, 184, 0.4)',
          }}
        >
          {isExpanded ? 'Shrink details' : 'Expand details'}
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="text-3xl md:text-4xl font-semibold text-emerald-300">{maskedBalance}</div>
        <button
          type="button"
          onClick={() => setIsBalanceHidden(previous => !previous)}
          className="inline-flex items-center justify-center rounded-full p-2 text-white/80 transition hover:text-white"
          style={{
            background: 'rgba(148, 163, 184, 0.2)',
            border: '1px solid rgba(148, 163, 184, 0.35)',
          }}
          aria-label={isBalanceHidden ? 'Show account balance' : 'Hide account balance'}
          title={isBalanceHidden ? 'Show balance' : 'Hide balance'}
        >
          {isBalanceHidden ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        <div className="rounded-2xl p-3" style={toneStyles.cyan}>
          <div className="text-xs mb-1" style={{ color: toneStyles.cyan.subText }}>
            Available for plans
          </div>
          <div className="text-base md:text-lg font-semibold" style={{ color: toneStyles.cyan.text }}>
            {availableForPlans}
          </div>
        </div>
        <div className="rounded-2xl p-3" style={toneStyles.violet}>
          <div className="text-xs mb-1" style={{ color: toneStyles.violet.subText }}>
            Withdrawable earnings
          </div>
          <div className="text-base md:text-lg font-semibold" style={{ color: toneStyles.violet.text }}>
            {withdrawableEarnings}
          </div>
        </div>
      </div>

      {(pendingCredits || pendingPurchaseDebits || pendingWithdrawals) && (
        <div className="mt-4 space-y-1 text-xs text-slate-200/80">
          {pendingCredits ? <div>Pending credits: {pendingCredits}</div> : null}
          {pendingPurchaseDebits ? <div>Pending purchase debits: {pendingPurchaseDebits}</div> : null}
          {pendingWithdrawals ? <div>Pending external withdrawals: {pendingWithdrawals}</div> : null}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/dashboard/account/fund"
          className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-white"
          style={{
            background: 'linear-gradient(135deg, #10b981, #047857)',
          }}
        >
          Fund Account
        </Link>
        <Link
          href="/dashboard/account/withdraw"
          className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-white"
          style={{
            background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
          }}
        >
          Withdraw Funds
        </Link>
      </div>

      <div
        className={`grid transition-all duration-300 ease-out ${
          isExpanded ? 'grid-rows-[1fr] opacity-100 mt-5' : 'grid-rows-[0fr] opacity-0 mt-0'
        }`}
      >
        <div className="overflow-hidden space-y-4 border-t border-white/15 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {detailMetrics.map(metric => {
              const tone = toneStyles[metric.tone ?? 'neutral']
              return (
                <div key={metric.label} className="rounded-2xl p-3" style={tone}>
                  <div className="text-xs mb-1" style={{ color: tone.subText }}>
                    {metric.label}
                  </div>
                  <div className="text-sm md:text-base font-semibold" style={{ color: tone.text }}>
                    {metric.value}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {walletFlowMetrics.map(flow => (
              <div
                key={flow.coin}
                className="rounded-2xl p-3"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.03))',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                <div className="text-xs text-white/70 mb-1">{flow.coin} Wallet Flow</div>
                <div className="text-sm font-semibold text-white">{flow.netCrypto}</div>
                <div className="text-xs text-white/70 mt-1">Value: {flow.netUsd}</div>
                <div className="text-[11px] text-emerald-300/90 mt-2">In: +{flow.totalInCrypto}</div>
                <div className="text-[11px] text-rose-300/90">Out: -{flow.totalOutCrypto}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
