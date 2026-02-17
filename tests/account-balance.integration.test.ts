import assert from 'node:assert/strict'
import { resolvePendingReconcileDecision } from '../lib/account-balance-reconciliation'

function run() {
  const funding = resolvePendingReconcileDecision('funding_deposit', 'stale_pending')
  assert.equal(funding.action, 'reject')

  const miningConfirmed = resolvePendingReconcileDecision('mining_plan_purchase', 'confirmed')
  assert.equal(miningConfirmed.action, 'settle')

  const miningPending = resolvePendingReconcileDecision('mining_plan_purchase', 'pending')
  assert.equal(miningPending.action, 'skip')

  const miningRejected = resolvePendingReconcileDecision('mining_plan_purchase', 'rejected')
  assert.equal(miningRejected.action, 'reject')

  const realEstateClosed = resolvePendingReconcileDecision('real_estate_buy_in', 'closed')
  assert.equal(realEstateClosed.action, 'settle')

  const realEstateWaiting = resolvePendingReconcileDecision('real_estate_withdrawal', 'waiting')
  assert.equal(realEstateWaiting.action, 'skip')

  const balanceWithdrawal = resolvePendingReconcileDecision('account_balance_withdrawal', 'confirmed')
  assert.equal(balanceWithdrawal.action, 'skip')

  console.log('account-balance reconciliation integration tests passed')
}

run()
