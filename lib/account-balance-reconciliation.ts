import type { AccountBalanceSource } from './account-balance'

export type ReconcileUpstreamState =
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'closed'
  | 'open'
  | 'waiting'
  | 'missing'
  | 'stale_pending'
  | 'unknown'

export type ReconcileDecision = {
  action: 'settle' | 'reject' | 'skip'
  reason: string
}

export function resolvePendingReconcileDecision(
  source: AccountBalanceSource,
  upstreamState: ReconcileUpstreamState
): ReconcileDecision {
  if (source === 'funding_deposit') {
    return {
      action: 'reject',
      reason: 'Funding request remained pending beyond reconciliation threshold.',
    }
  }

  if (source === 'mining_plan_purchase' || source === 'trading_plan_purchase') {
    if (upstreamState === 'confirmed') {
      return { action: 'settle', reason: 'Plan payment is already confirmed upstream.' }
    }
    if (upstreamState === 'pending' || upstreamState === 'waiting' || upstreamState === 'open') {
      return { action: 'skip', reason: 'Plan payment is still pending upstream review.' }
    }
    return { action: 'reject', reason: 'Plan payment is no longer pending upstream.' }
  }

  if (source === 'real_estate_buy_in' || source === 'real_estate_withdrawal') {
    if (upstreamState === 'closed' || upstreamState === 'confirmed') {
      return { action: 'settle', reason: 'Support ticket is closed upstream.' }
    }
    if (upstreamState === 'rejected') {
      return { action: 'reject', reason: 'Support ticket is rejected upstream.' }
    }
    return { action: 'skip', reason: 'Support ticket is still open/waiting upstream.' }
  }

  if (source === 'account_balance_withdrawal') {
    return {
      action: 'skip',
      reason: 'Account-balance withdrawals are reconciled from Account Balance Controls.',
    }
  }

  return { action: 'skip', reason: 'No reconciliation rule matched.' }
}
