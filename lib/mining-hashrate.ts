// Keeps mining plan hashrate scaling in one place so display, approvals,
// and limits stay consistent across dashboard and admin flows.
export const MINING_PLAN_HASHRATE_SCALE = 200

export function scalePlanHashrate(baseHashrate: number) {
  return baseHashrate * MINING_PLAN_HASHRATE_SCALE
}

export function scalePlanHashrateDecimal<T extends { mul: (value: number) => T }>(baseHashrate: T) {
  return baseHashrate.mul(MINING_PLAN_HASHRATE_SCALE)
}
