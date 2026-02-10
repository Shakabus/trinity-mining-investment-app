export type RealEstatePositionStatus = 'active' | 'maturing' | 'completed'

export type RealEstatePosition = {
  id: string
  property: string
  location: string
  tier: string
  category: 'Hotel' | 'Resort' | 'Urban' | 'Mixed'
  allocationUsd: number
  cycleMonths: number
  startedAt: string
  nextPayoutAt: string
  occupancyPct: number
  monthlyYieldPct: number
  totalEarnedUsd: number
  projectedCycleReturnBand: string
  cycleProgressPct: number
  status: RealEstatePositionStatus
}

export type RealEstatePayoutEvent = {
  id: string
  property: string
  periodLabel: string
  grossUsd: number
  feesUsd: number
  netUsd: number
  status: 'scheduled' | 'paid'
  payoutDate: string
}

export type RealEstateWithdrawal = {
  id: string
  requestedAt: string
  amountUsd: number
  method: string
  destination: string
  status: 'pending' | 'processing' | 'paid' | 'rejected'
  reference: string
}

export const realEstatePositions: RealEstatePosition[] = [
  {
    id: 're-pos-001',
    property: 'The Hoxton, Poblenou',
    location: 'Barcelona, Spain',
    tier: 'Floor Allocation Plus',
    category: 'Urban',
    allocationUsd: 37500,
    cycleMonths: 24,
    startedAt: '2026-01-12',
    nextPayoutAt: '2026-03-08',
    occupancyPct: 84,
    monthlyYieldPct: 6.8,
    totalEarnedUsd: 5150,
    projectedCycleReturnBand: '220% - 300%',
    cycleProgressPct: 18,
    status: 'active',
  },
  {
    id: 're-pos-002',
    property: 'Fairmont Olympic Hotel',
    location: 'Seattle, Washington',
    tier: 'Premium Operations Pool',
    category: 'Hotel',
    allocationUsd: 22500,
    cycleMonths: 18,
    startedAt: '2025-12-05',
    nextPayoutAt: '2026-03-03',
    occupancyPct: 79,
    monthlyYieldPct: 5.9,
    totalEarnedUsd: 2920,
    projectedCycleReturnBand: '175% - 245%',
    cycleProgressPct: 22,
    status: 'active',
  },
  {
    id: 're-pos-003',
    property: 'The Diplomat Beach Resort',
    location: 'Hollywood, Florida',
    tier: 'Oceanfront Yield Plus',
    category: 'Resort',
    allocationUsd: 58000,
    cycleMonths: 24,
    startedAt: '2025-09-17',
    nextPayoutAt: '2026-03-11',
    occupancyPct: 87,
    monthlyYieldPct: 7.4,
    totalEarnedUsd: 16120,
    projectedCycleReturnBand: '230% - 310%',
    cycleProgressPct: 39,
    status: 'maturing',
  },
  {
    id: 're-pos-004',
    property: 'Park Hyatt Zurich',
    location: 'Zurich, Switzerland',
    tier: 'Executive Hospitality Plus',
    category: 'Hotel',
    allocationUsd: 52000,
    cycleMonths: 24,
    startedAt: '2025-05-09',
    nextPayoutAt: '2026-03-15',
    occupancyPct: 82,
    monthlyYieldPct: 6.2,
    totalEarnedUsd: 20580,
    projectedCycleReturnBand: '230% - 315%',
    cycleProgressPct: 56,
    status: 'maturing',
  },
  {
    id: 're-pos-005',
    property: 'JW Marriott Desert Ridge',
    location: 'Phoenix, Arizona',
    tier: 'Convention Yield Pool',
    category: 'Mixed',
    allocationUsd: 30500,
    cycleMonths: 18,
    startedAt: '2025-03-20',
    nextPayoutAt: '2026-03-01',
    occupancyPct: 76,
    monthlyYieldPct: 5.5,
    totalEarnedUsd: 18890,
    projectedCycleReturnBand: '190% - 265%',
    cycleProgressPct: 94,
    status: 'completed',
  },
]

export const realEstatePayoutEvents: RealEstatePayoutEvent[] = [
  {
    id: 're-pay-001',
    property: 'The Hoxton, Poblenou',
    periodLabel: 'Feb 2026 Cycle',
    grossUsd: 2940,
    feesUsd: 180,
    netUsd: 2760,
    status: 'paid',
    payoutDate: '2026-02-08',
  },
  {
    id: 're-pay-002',
    property: 'Fairmont Olympic Hotel',
    periodLabel: 'Feb 2026 Cycle',
    grossUsd: 1410,
    feesUsd: 90,
    netUsd: 1320,
    status: 'paid',
    payoutDate: '2026-02-03',
  },
  {
    id: 're-pay-003',
    property: 'The Diplomat Beach Resort',
    periodLabel: 'Mar 2026 Forecast',
    grossUsd: 4580,
    feesUsd: 310,
    netUsd: 4270,
    status: 'scheduled',
    payoutDate: '2026-03-11',
  },
  {
    id: 're-pay-004',
    property: 'Park Hyatt Zurich',
    periodLabel: 'Mar 2026 Forecast',
    grossUsd: 3370,
    feesUsd: 240,
    netUsd: 3130,
    status: 'scheduled',
    payoutDate: '2026-03-15',
  },
]

export const realEstateWithdrawals: RealEstateWithdrawal[] = [
  {
    id: 're-wd-001',
    requestedAt: '2026-02-09',
    amountUsd: 4200,
    method: 'USDT (ERC-20)',
    destination: '0x8610A9E40FAD...64334',
    status: 'paid',
    reference: 'RE-WD-9C1A',
  },
  {
    id: 're-wd-002',
    requestedAt: '2026-02-20',
    amountUsd: 1950,
    method: 'BTC',
    destination: 'bc1q76ztuupz...9cwv4',
    status: 'processing',
    reference: 'RE-WD-3F7E',
  },
  {
    id: 're-wd-003',
    requestedAt: '2026-02-27',
    amountUsd: 1280,
    method: 'USDT (ERC-20)',
    destination: '0x8610A9E40FAD...64334',
    status: 'pending',
    reference: 'RE-WD-2D4B',
  },
]

export const realEstateAvailableWithdrawalUsd = 5400

