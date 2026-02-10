'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, Shield, ShieldCheck, Trash2 } from 'lucide-react'
import { useToast } from '@/components/ui/ToastProvider'

interface UserDetailProps {
  user: {
    id: number
    fullName: string | null
    email: string
    role: string
    accountStatus: string
    createdAt: string
    btcWalletAddress?: string | null
    ethWalletAddress?: string | null
    ltcWalletAddress?: string | null
  }
  currentPlan?: {
    id: number
    name: string
    status: string
    coinType: string
    baseHashrate: number
    hashrateUnit: string
    algorithm: string
    startDate: string | null
    endDate: string | null
  }
  miningStats?: {
    id: number
    assignedHashrate: number
    hashrateUnit: string
    counterSpeed: number
    isActive: boolean
    miningPool?: string
    dataCenterLocation?: string
  }
  earnings: {
    id: number
    coinType: string
    dailyEstimateUsd: number
    dailyEstimateCrypto: number
    totalEarnedUsd: number
    totalEarnedCrypto: number
    isActive: boolean
    contextLabel: string
    allocationLabel: string | null
    planName: string
    isAdminOverride?: boolean
    isHistorical?: boolean
    isWithdrawable?: boolean
  }[]
  activity: {
    id: string
    title: string
    detail: string
    timestamp: string
  }[]
  tradingPlan?: {
    id: number
    name: string
    status: string
    investmentUsd: number
    expectedReturnUsd: number
    durationHours: number
    startDate: string | null
    endDate: string | null
  }
  tradingStats?: {
    id: number
    botSpeed: number
    strategy: string
    riskLevel: string
    isActive: boolean
  }
  tradingEarnings?: {
    id: number
    dailyEstimateUsd: number
    totalEarnedUsd: number
    isActive: boolean
    isAdminOverride?: boolean
    planName: string
  }[]
  realEstate?: {
    summary: {
      totalAllocationUsd: number
      approvedCount: number
      pendingCount: number
      availableWithdrawalUsd: number
      monthlyRealizedUsd: number
      canRequestWithdrawal: boolean
      nextWithdrawalEligibleAt: string | null
      canCreateNewBuyIn: boolean
    }
    positions: {
      id: number
      property: string
      location: string
      tier: string
      allocationUsd: number
      duration: string
      projectedBand: string
      monthlyIncomeUsd: number
      submittedAt: string
      status: 'submitted' | 'under_review' | 'approved'
    }[]
    withdrawals: {
      id: string
      reference: string
      requestedAt: string
      amountUsd: number
      method: string
      destination: string
      status: 'pending' | 'processing' | 'paid' | 'rejected'
    }[]
  }
}

function formatDate(value: string | null) {
  if (!value) return 'â€”'
  const date = new Date(value)
  return date.toLocaleString()
}

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export default function UserDetail({
  user,
  currentPlan,
  miningStats,
  earnings,
  activity,
  tradingPlan,
  tradingStats,
  tradingEarnings = [],
  realEstate,
}: UserDetailProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [assignedHashrate, setAssignedHashrate] = useState(miningStats?.assignedHashrate ?? 0)
  const [counterSpeed, setCounterSpeed] = useState(miningStats?.counterSpeed ?? 0.001)
  const [miningPool, setMiningPool] = useState(miningStats?.miningPool ?? '')
  const [dataCenterLocation, setDataCenterLocation] = useState(miningStats?.dataCenterLocation ?? '')
  const [isBusy, setIsBusy] = useState(false)
  const [portfolioCadence, setPortfolioCadence] = useState(tradingStats?.botSpeed ?? 1)
  const [portfolioStrategy, setPortfolioStrategy] = useState(tradingStats?.strategy ?? 'Portfolio Balance')
  const [portfolioRisk, setPortfolioRisk] = useState(tradingStats?.riskLevel ?? 'balanced')

  const poolOptions = ['AntPool', 'Foundry USA', 'ViaBTC', 'F2Pool', 'Luxor']
  const locationOptions = [
    'Canada (Hydro)',
    'Texas, USA (Wind)',
    'Norway (Renewable)',
    'Iceland (Geothermal)',
    'Germany (Grid)',
  ]
  const strategyOptions = ['Portfolio Balance', 'Macro Rotation', 'Yield Capture', 'Risk Parity', 'Momentum Blend']
  const riskOptions = ['conservative', 'balanced', 'growth', 'aggressive']

  const earningsState = useMemo(
    () =>
      earnings.map(record => ({
        ...record,
        dailyEstimateUsd: record.dailyEstimateUsd.toString(),
        dailyEstimateCrypto: record.dailyEstimateCrypto.toString(),
        totalEarnedUsd: record.totalEarnedUsd.toString(),
        totalEarnedCrypto: record.totalEarnedCrypto.toString(),
      })),
    [earnings]
  )
  const [earningsInputs, setEarningsInputs] = useState(earningsState)
  const tradingEarningsState = useMemo(
    () =>
      tradingEarnings.map(record => ({
        ...record,
        dailyEstimateUsd: record.dailyEstimateUsd.toString(),
        totalEarnedUsd: record.totalEarnedUsd.toString(),
      })),
    [tradingEarnings]
  )
  const [tradingEarningsInputs, setTradingEarningsInputs] = useState(tradingEarningsState)
  const mapPositionStatusToTicketStatus = (status: 'submitted' | 'under_review' | 'approved') => {
    if (status === 'approved') return 'closed'
    if (status === 'under_review') return 'waiting'
    return 'open'
  }
  const mapWithdrawalStatusToTicketStatus = (
    status: 'pending' | 'processing' | 'paid' | 'rejected',
  ) => {
    if (status === 'paid') return 'closed'
    if (status === 'processing') return 'waiting'
    return 'open'
  }

  const handleMiningUpdate = async () => {
    if (!miningStats) return
    setIsBusy(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'updateMining',
            assignedHashrate: Number(assignedHashrate),
            counterSpeed: Number(counterSpeed),
            miningPool,
            dataCenterLocation,
          }),
        })
      if (!response.ok) {
        showToast('Failed to update mining stats.', 'error')
      } else {
        showToast('Mining stats updated.', 'success')
        router.refresh()
      }
    } finally {
      setIsBusy(false)
    }
  }

  const handleToggleMining = async (nextActive: boolean) => {
    if (!miningStats) return
    setIsBusy(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggleMining',
          isActive: nextActive,
        }),
      })
      if (!response.ok) {
        showToast('Failed to update mining status.', 'error')
      } else {
        showToast(nextActive ? 'Mining resumed.' : 'Mining paused.', 'success')
        router.refresh()
      }
    } finally {
      setIsBusy(false)
    }
  }

  const handleEarningsUpdate = async (recordId: number) => {
    const record = earningsInputs.find(item => item.id === recordId)
    if (!record) return
    setIsBusy(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateEarnings',
          earningsId: recordId,
          dailyEstimateUsd: Number(record.dailyEstimateUsd || 0),
          dailyEstimateCrypto: Number(record.dailyEstimateCrypto || 0),
          totalEarnedUsd: Number(record.totalEarnedUsd || 0),
          totalEarnedCrypto: Number(record.totalEarnedCrypto || 0),
        }),
      })
      if (!response.ok) {
        showToast('Failed to update earnings.', 'error')
      } else {
        showToast('Earnings updated.', 'success')
        router.refresh()
      }
    } finally {
      setIsBusy(false)
    }
  }

  const handleUnlockHistorical = async (recordId: number) => {
    setIsBusy(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unlockHistorical',
          earningsId: recordId,
        }),
      })
      if (!response.ok) {
        showToast('Failed to unlock earnings.', 'error')
      } else {
        showToast('Historical earnings unlocked.', 'success')
        router.refresh()
      }
    } finally {
      setIsBusy(false)
    }
  }

  const handleTradingUpdate = async () => {
    if (!tradingStats) return
    setIsBusy(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateTrading',
          botSpeed: Number(portfolioCadence),
          strategy: portfolioStrategy,
          riskLevel: portfolioRisk,
        }),
      })
      if (!response.ok) {
        showToast('Failed to update trading settings.', 'error')
      } else {
        showToast('Trading settings updated.', 'success')
        router.refresh()
      }
    } finally {
      setIsBusy(false)
    }
  }

  const handleToggleTrading = async (nextActive: boolean) => {
    if (!tradingStats) return
    setIsBusy(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggleTrading',
          isActive: nextActive,
        }),
      })
      if (!response.ok) {
        showToast('Failed to update trading status.', 'error')
      } else {
        showToast(nextActive ? 'Trading resumed.' : 'Trading paused.', 'success')
        router.refresh()
      }
    } finally {
      setIsBusy(false)
    }
  }

  const handleTradingEarningsUpdate = async (recordId: number) => {
    const record = tradingEarningsInputs.find(item => item.id === recordId)
    if (!record) return
    setIsBusy(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateTradingEarnings',
          earningsId: recordId,
          dailyEstimateUsd: Number(record.dailyEstimateUsd || 0),
          totalEarnedUsd: Number(record.totalEarnedUsd || 0),
        }),
      })
      if (!response.ok) {
        showToast('Failed to update trading earnings.', 'error')
      } else {
        showToast('Trading earnings updated.', 'success')
        router.refresh()
      }
    } finally {
      setIsBusy(false)
    }
  }

  const handleRealEstateTicketStatus = async (
    ticketId: number | string,
    status: 'open' | 'waiting' | 'closed',
  ) => {
    setIsBusy(true)
    try {
      const response = await fetch('/api/admin/support/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: Number(ticketId),
          status,
        }),
      })
      if (!response.ok) {
        showToast('Failed to update real-estate ticket status.', 'error')
      } else {
        showToast('Real-estate ticket status updated.', 'success')
        router.refresh()
      }
    } finally {
      setIsBusy(false)
    }
  }

  const handleAccountStatus = async (status: string) => {
    setIsBusy(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateUser',
          accountStatus: status,
        }),
      })
      if (!response.ok) {
        showToast('Failed to update account status.', 'error')
      } else {
        showToast('Account status updated.', 'success')
        router.refresh()
      }
    } finally {
      setIsBusy(false)
    }
  }

  const handleRoleChange = async (role: string) => {
    setIsBusy(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateUser',
          role,
        }),
      })
      if (!response.ok) {
        showToast('Failed to update role.', 'error')
      } else {
        showToast('Role updated.', 'success')
        router.refresh()
      }
    } finally {
      setIsBusy(false)
    }
  }

  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDelete = async () => {
    if (!confirmDelete) return
    setIsBusy(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        showToast('Failed to delete user.', 'error')
      } else {
        showToast('User deleted.', 'success')
        router.push('/admin/users')
        router.refresh()
      }
    } finally {
      setIsBusy(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">User Detail</h1>
          <p className="text-white/70">
            Manage account settings, mining/trading controls, real-estate approvals, and earnings overrides.
          </p>
        </div>
        <div className="text-white/50 text-sm">Joined {formatDate(user.createdAt)}</div>
      </div>


      <div
        className="mt-6 p-6 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="text-white font-semibold text-xl">{user.fullName || 'No Name'}</div>
            <div className="text-white/60">{user.email}</div>
            <div className="text-white/60 text-sm mt-2">Role: {user.role}</div>
            <div className="text-white/60 text-sm">Status: {user.accountStatus}</div>
            <div className="text-white/50 text-xs mt-3">BTC: {user.btcWalletAddress || 'Not set'}</div>
            <div className="text-white/50 text-xs">ETH: {user.ethWalletAddress || 'Not set'}</div>
            <div className="text-white/50 text-xs">LTC: {user.ltcWalletAddress || 'Not set'}</div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105"
              style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.4)' }}
              disabled={isBusy}
              onClick={() => handleAccountStatus('active')}
            >
              Activate
            </button>
            <button
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105"
              style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.4)' }}
              disabled={isBusy}
              onClick={() => handleAccountStatus('suspended')}
            >
              Suspend
            </button>
            <button
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105 flex items-center gap-2"
              style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#c7d2fe', border: '1px solid rgba(99,102,241,0.4)' }}
              disabled={isBusy}
              onClick={() => handleRoleChange(user.role === 'admin' ? 'user' : 'admin')}
            >
              <Shield size={16} />
              {user.role === 'admin' ? 'Set User' : 'Set Admin'}
            </button>
            <button
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105 flex items-center gap-2"
              style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fecaca', border: '1px solid rgba(239,68,68,0.4)' }}
              disabled={isBusy}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <div
          className="p-4 rounded-2xl"
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#fecaca',
          }}
        >
          <div className="text-sm font-semibold mb-2">Confirm delete</div>
          <div className="text-xs text-white/70 mb-3">
            Delete {user.fullName || user.email}? This cannot be undone.
          </div>
          <div className="flex gap-2">
            <button
              className="px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-105"
              style={{ background: 'rgba(239, 68, 68, 0.25)', border: '1px solid rgba(239,68,68,0.5)', color: '#ffffff' }}
              onClick={handleDelete}
              disabled={isBusy}
            >
              Yes, delete
            </button>
            <button
              className="px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-105"
              style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff' }}
              onClick={() => setConfirmDelete(false)}
              disabled={isBusy}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {currentPlan && (
        <div
          className="p-6 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <h2 className="text-white font-semibold text-lg mb-4">Current Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-white/80">
            <div>
              <div className="text-white/50 mb-1">Plan</div>
              <div className="text-white font-semibold">{currentPlan.name}</div>
            </div>
            <div>
              <div className="text-white/50 mb-1">Status</div>
              <div className="text-white font-semibold">{currentPlan.status}</div>
            </div>
            <div>
              <div className="text-white/50 mb-1">Coin</div>
              <div className="text-white font-semibold">{currentPlan.coinType}</div>
            </div>
            <div>
              <div className="text-white/50 mb-1">Assigned Hashrate</div>
              <div className="text-white font-semibold">
                {currentPlan.baseHashrate} {currentPlan.hashrateUnit}
              </div>
            </div>
            <div>
              <div className="text-white/50 mb-1">Algorithm</div>
              <div className="text-white font-semibold">{currentPlan.algorithm}</div>
            </div>
            <div>
              <div className="text-white/50 mb-1">Start</div>
              <div className="text-white font-semibold">{formatDate(currentPlan.startDate)}</div>
            </div>
            <div>
              <div className="text-white/50 mb-1">End</div>
              <div className="text-white font-semibold">{formatDate(currentPlan.endDate)}</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div
          className="p-6 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
            <Activity size={18} />
            Mining Controls
          </h2>
          {miningStats ? (
            <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-white/60 text-xs">Assigned Hashrate</label>
                  <input
                    type="number"
                    value={assignedHashrate}
                    onChange={event => setAssignedHashrate(Number(event.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                    }}
                  />
                  <div className="text-xs text-white/40 mt-1">{miningStats.hashrateUnit}</div>
                </div>
                <div>
                  <label className="text-white/60 text-xs">Counter Speed</label>
                  <input
                    type="number"
                    value={counterSpeed}
                    step="0.0001"
                    onChange={event => setCounterSpeed(Number(event.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                    }}
                  />
                </div>
                <div>
                  <label className="text-white/60 text-xs">Mining Pool</label>
                  <select
                    value={miningPool}
                    onChange={event => setMiningPool(event.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                    }}
                  >
                    <option value="" disabled>
                      Select pool
                    </option>
                    {poolOptions.map((pool) => (
                      <option key={pool} value={pool} style={{ color: '#000000' }}>
                        {pool}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-white/60 text-xs">Data Center Location</label>
                  <select
                    value={dataCenterLocation}
                    onChange={event => setDataCenterLocation(event.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                    }}
                  >
                    <option value="" disabled>
                      Select location
                    </option>
                    {locationOptions.map((location) => (
                      <option key={location} value={location} style={{ color: '#000000' }}>
                        {location}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                  style={{ background: 'rgba(88, 45, 255, 0.2)', border: '1px solid rgba(88,45,255,0.4)', color: '#c4b5fd' }}
                  disabled={isBusy}
                  onClick={handleMiningUpdate}
                >
                  Save Mining Settings
                </button>
                <button
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105 flex items-center gap-2"
                  style={{
                    background: miningStats.isActive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: miningStats.isActive ? '#fecaca' : '#6ee7b7',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                  disabled={isBusy}
                  onClick={() => handleToggleMining(!miningStats.isActive)}
                >
                  <ShieldCheck size={16} />
                  {miningStats.isActive ? 'Pause Mining' : 'Resume Mining'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-white/60 text-sm">No active mining stats found.</div>
          )}
        </div>

        <div
          className="p-6 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <h2 className="text-white font-semibold text-lg mb-4">Earnings Overrides</h2>
          {earningsInputs.length === 0 ? (
            <div className="text-white/60 text-sm">No earnings records found.</div>
          ) : (
            <div className="space-y-4">
              {earningsInputs.map(record => (
                <div key={record.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="text-white font-semibold">{record.coinType}</div>
                  <div className="text-xs text-white/50">{record.contextLabel}</div>
                  {record.allocationLabel && (
                    <div className="text-xs text-white/40">Allocation: {record.allocationLabel}</div>
                  )}
                  <div className="text-xs text-white/40">
                    User dashboard shows this under {record.coinType} earned for {record.planName}.
                  </div>
                  {record.isAdminOverride && (
                    <div className="mt-1 text-xs text-amber-300">Admin override active (auto updates paused)</div>
                  )}
                  {record.isHistorical && !record.isWithdrawable && (
                    <div className="mt-1 text-xs text-blue-300">Pending system release</div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <label className="text-white/60 text-xs">Daily Estimate (USD)</label>
                      <input
                        type="number"
                        value={record.dailyEstimateUsd}
                        onChange={event =>
                          setEarningsInputs(prev =>
                            prev.map(item =>
                              item.id === record.id ? { ...item, dailyEstimateUsd: event.target.value } : item
                            )
                          )
                        }
                        className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#ffffff',
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-white/60 text-xs">Daily Estimate (Crypto)</label>
                      <input
                        type="number"
                        value={record.dailyEstimateCrypto}
                        onChange={event =>
                          setEarningsInputs(prev =>
                            prev.map(item =>
                              item.id === record.id ? { ...item, dailyEstimateCrypto: event.target.value } : item
                            )
                          )
                        }
                        className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#ffffff',
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-white/60 text-xs">Total Earned (USD)</label>
                      <input
                        type="number"
                        value={record.totalEarnedUsd}
                        onChange={event =>
                          setEarningsInputs(prev =>
                            prev.map(item =>
                              item.id === record.id ? { ...item, totalEarnedUsd: event.target.value } : item
                            )
                          )
                        }
                        className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#ffffff',
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-white/60 text-xs">Total Earned (Crypto)</label>
                      <input
                        type="number"
                        value={record.totalEarnedCrypto}
                        onChange={event =>
                          setEarningsInputs(prev =>
                            prev.map(item =>
                              item.id === record.id ? { ...item, totalEarnedCrypto: event.target.value } : item
                            )
                          )
                        }
                        className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#ffffff',
                        }}
                      />
                    </div>
                  </div>
                  <button
                    className="px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105"
                    style={{
                      background: 'rgba(88, 45, 255, 0.2)',
                      border: '1px solid rgba(88,45,255,0.4)',
                      color: '#c4b5fd',
                    }}
                    disabled={isBusy}
                    onClick={() => handleEarningsUpdate(record.id)}
                  >
                    Save Earnings
                  </button>
                  {record.isHistorical && !record.isWithdrawable && (
                    <button
                      className="px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105"
                      style={{
                        background: 'rgba(16, 185, 129, 0.2)',
                        border: '1px solid rgba(16,185,129,0.4)',
                        color: '#6ee7b7',
                      }}
                      disabled={isBusy}
                      onClick={() => handleUnlockHistorical(record.id)}
                    >
                      Unlock Historical Earnings
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        className="mt-8 p-6 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div
          className="p-6 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <h2 className="text-white font-semibold text-lg mb-4">Trading Plan</h2>
          {tradingPlan ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-white/80">
              <div>
                <div className="text-white/50 mb-1">Plan</div>
                <div className="text-white font-semibold">{tradingPlan.name}</div>
              </div>
              <div>
                <div className="text-white/50 mb-1">Status</div>
                <div className="text-white font-semibold">{tradingPlan.status}</div>
              </div>
              <div>
                <div className="text-white/50 mb-1">Investment</div>
                <div className="text-white font-semibold">${tradingPlan.investmentUsd.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-white/50 mb-1">Expected Return</div>
                <div className="text-white font-semibold">${tradingPlan.expectedReturnUsd.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-white/50 mb-1">Duration</div>
                <div className="text-white font-semibold">{tradingPlan.durationHours} hours</div>
              </div>
              <div>
                <div className="text-white/50 mb-1">Start</div>
                <div className="text-white font-semibold">{formatDate(tradingPlan.startDate)}</div>
              </div>
              <div>
                <div className="text-white/50 mb-1">End</div>
                <div className="text-white font-semibold">{formatDate(tradingPlan.endDate)}</div>
              </div>
            </div>
          ) : (
            <div className="text-white/60 text-sm">No trading plan found.</div>
          )}
        </div>

        <div
          className="p-6 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <h2 className="text-white font-semibold text-lg mb-4">Portfolio Controls</h2>
          {tradingStats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-white/60 text-xs">Portfolio Cadence</label>
                  <input
                    type="number"
                    step="0.1"
                    value={portfolioCadence}
                    onChange={event => setPortfolioCadence(Number(event.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                    }}
                  />
                  <div className="text-xs text-white/40 mt-1">0.5x - 2.5x</div>
                </div>
                <div>
                  <label className="text-white/60 text-xs">Strategy</label>
                  <select
                    value={portfolioStrategy}
                    onChange={event => setPortfolioStrategy(event.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                    }}
                  >
                    {strategyOptions.map(option => (
                      <option key={option} value={option} style={{ color: '#000000' }}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-white/60 text-xs">Risk Level</label>
                  <select
                    value={portfolioRisk}
                    onChange={event => setPortfolioRisk(event.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                    }}
                  >
                    {riskOptions.map(option => (
                      <option key={option} value={option} style={{ color: '#000000' }}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                  style={{ background: 'rgba(88, 45, 255, 0.2)', border: '1px solid rgba(88,45,255,0.4)', color: '#c4b5fd' }}
                  disabled={isBusy}
                  onClick={handleTradingUpdate}
                >
                  Save Portfolio Settings
                </button>
                <button
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105 flex items-center gap-2"
                  style={{
                    background: tradingStats.isActive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: tradingStats.isActive ? '#fecaca' : '#6ee7b7',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                  disabled={isBusy}
                  onClick={() => handleToggleTrading(!tradingStats.isActive)}
                >
                  <ShieldCheck size={16} />
                  {tradingStats.isActive ? 'Pause Portfolio' : 'Resume Portfolio'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-white/60 text-sm">No trading stats found.</div>
          )}
        </div>
      </div>

      <div
        className="mt-8 p-6 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        <h2 className="text-white font-semibold text-lg mb-4">Trading Earnings Overrides</h2>
        {tradingEarningsInputs.length === 0 ? (
          <div className="text-white/60 text-sm">No trading earnings records found.</div>
        ) : (
          <div className="space-y-4">
            {tradingEarningsInputs.map(record => (
              <div key={record.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="text-white font-semibold">{record.planName}</div>
                {record.isAdminOverride && (
                  <div className="mt-1 text-xs text-amber-300">Override active (auto updates paused)</div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <label className="text-white/60 text-xs">Daily Estimate (USD)</label>
                    <input
                      type="number"
                      value={record.dailyEstimateUsd}
                      onChange={event =>
                        setTradingEarningsInputs(prev =>
                          prev.map(item =>
                            item.id === record.id ? { ...item, dailyEstimateUsd: event.target.value } : item
                          )
                        )
                      }
                      className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#ffffff',
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-white/60 text-xs">Total Earned (USD)</label>
                    <input
                      type="number"
                      value={record.totalEarnedUsd}
                      onChange={event =>
                        setTradingEarningsInputs(prev =>
                          prev.map(item =>
                            item.id === record.id ? { ...item, totalEarnedUsd: event.target.value } : item
                          )
                        )
                      }
                      className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#ffffff',
                      }}
                    />
                  </div>
                </div>
                <button
                  className="px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105"
                  style={{
                    background: 'rgba(88, 45, 255, 0.2)',
                    border: '1px solid rgba(88,45,255,0.4)',
                    color: '#c4b5fd',
                  }}
                  disabled={isBusy}
                  onClick={() => handleTradingEarningsUpdate(record.id)}
                >
                  Save Trading Earnings
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
        {realEstate && (
          <div className="mt-8 space-y-6 mb-6">
            <div>
              <h2 className="text-white font-semibold text-lg">Real Estate Controls</h2>
              <p className="text-white/60 text-sm mt-1">
                Manage real-estate approvals, track user portfolio metrics, and control payout flow.
              </p>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-xs text-white/50 mb-1">Approved Lanes</div>
                <div className="text-lg text-white font-semibold">{realEstate.summary.approvedCount}</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-xs text-white/50 mb-1">Pending Lanes</div>
                <div className="text-lg text-white font-semibold">{realEstate.summary.pendingCount}</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-xs text-white/50 mb-1">Total Allocation</div>
                <div className="text-lg text-white font-semibold">
                  {formatUsd(realEstate.summary.totalAllocationUsd)}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-xs text-white/50 mb-1">Available To Withdraw</div>
                <div className="text-lg text-white font-semibold">
                  {formatUsd(realEstate.summary.availableWithdrawalUsd)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-xs text-white/50 mb-1">Realized This Month</div>
                <div className="text-xl text-white font-semibold">
                  {formatUsd(realEstate.summary.monthlyRealizedUsd)}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-xs text-white/50 mb-1">Buy-In Gate</div>
                <div className="text-sm text-white/85">
                  {realEstate.summary.canCreateNewBuyIn
                    ? 'Open: user can submit a new buy-in.'
                    : 'Locked: user has a pending buy-in awaiting approval.'}
                </div>
                {!realEstate.summary.canRequestWithdrawal && realEstate.summary.nextWithdrawalEligibleAt && (
                  <div className="text-xs text-amber-200 mt-2">
                    Withdrawal window opens: {formatDate(realEstate.summary.nextWithdrawalEligibleAt)}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-white font-semibold">Buy-In Approval Queue</h3>
              {realEstate.positions.length === 0 ? (
                <div className="text-white/60 text-sm p-4 rounded-2xl bg-white/5 border border-white/10">
                  No real-estate buy-in tickets found for this user.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
                  <table className="min-w-[1100px] w-full text-left">
                    <thead>
                      <tr className="text-xs uppercase tracking-[0.08em] text-white/55">
                        <th className="py-3 px-4">Property</th>
                        <th className="py-3 px-4">Tier</th>
                        <th className="py-3 px-4">Allocation</th>
                        <th className="py-3 px-4">Monthly Income</th>
                        <th className="py-3 px-4">Duration</th>
                        <th className="py-3 px-4">Submitted</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {realEstate.positions.map(position => {
                        const ticketStatus = mapPositionStatusToTicketStatus(position.status)
                        return (
                          <tr key={position.id} className="border-t border-white/10">
                            <td className="py-3 px-4 text-white">
                              <div className="font-semibold">{position.property}</div>
                              <div className="text-xs text-white/60">{position.location}</div>
                            </td>
                            <td className="py-3 px-4 text-white/85">{position.tier}</td>
                            <td className="py-3 px-4 text-white">{formatUsd(position.allocationUsd)}</td>
                            <td className="py-3 px-4 text-white">{formatUsd(position.monthlyIncomeUsd)}</td>
                            <td className="py-3 px-4 text-white/80">{position.duration}</td>
                            <td className="py-3 px-4 text-white/80">{formatDate(position.submittedAt)}</td>
                            <td className="py-3 px-4">
                              <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-white">
                                {position.status === 'approved'
                                  ? 'Approved'
                                  : position.status === 'under_review'
                                  ? 'Under Review'
                                  : 'Submitted'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/20 text-sky-200 border border-sky-400/35 disabled:opacity-50"
                                  disabled={isBusy || ticketStatus === 'waiting'}
                                  onClick={() => handleRealEstateTicketStatus(position.id, 'waiting')}
                                >
                                  Set Review
                                </button>
                                <button
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/35 disabled:opacity-50"
                                  disabled={isBusy || ticketStatus === 'closed'}
                                  onClick={() => handleRealEstateTicketStatus(position.id, 'closed')}
                                >
                                  Approve
                                </button>
                                <button
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-200 border border-amber-400/35 disabled:opacity-50"
                                  disabled={isBusy || ticketStatus === 'open'}
                                  onClick={() => handleRealEstateTicketStatus(position.id, 'open')}
                                >
                                  Reopen
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-white font-semibold">Withdrawal Request Queue</h3>
              {realEstate.withdrawals.length === 0 ? (
                <div className="text-white/60 text-sm p-4 rounded-2xl bg-white/5 border border-white/10">
                  No real-estate withdrawal requests found for this user.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
                  <table className="min-w-[1020px] w-full text-left">
                    <thead>
                      <tr className="text-xs uppercase tracking-[0.08em] text-white/55">
                        <th className="py-3 px-4">Reference</th>
                        <th className="py-3 px-4">Requested</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Method</th>
                        <th className="py-3 px-4">Destination</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {realEstate.withdrawals.map(withdrawal => {
                        const ticketStatus = mapWithdrawalStatusToTicketStatus(withdrawal.status)
                        return (
                          <tr key={withdrawal.id} className="border-t border-white/10">
                            <td className="py-3 px-4 text-white">{withdrawal.reference}</td>
                            <td className="py-3 px-4 text-white/80">{formatDate(withdrawal.requestedAt)}</td>
                            <td className="py-3 px-4 text-white">{formatUsd(withdrawal.amountUsd)}</td>
                            <td className="py-3 px-4 text-white/80">{withdrawal.method}</td>
                            <td className="py-3 px-4 text-white/70">{withdrawal.destination}</td>
                            <td className="py-3 px-4">
                              <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-white">
                                {withdrawal.status === 'paid'
                                  ? 'Paid'
                                  : withdrawal.status === 'processing'
                                  ? 'Processing'
                                  : withdrawal.status === 'rejected'
                                  ? 'Rejected'
                                  : 'Pending'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/20 text-sky-200 border border-sky-400/35 disabled:opacity-50"
                                  disabled={isBusy || ticketStatus === 'waiting'}
                                  onClick={() => handleRealEstateTicketStatus(withdrawal.id, 'waiting')}
                                >
                                  Set Processing
                                </button>
                                <button
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/35 disabled:opacity-50"
                                  disabled={isBusy || ticketStatus === 'closed'}
                                  onClick={() => handleRealEstateTicketStatus(withdrawal.id, 'closed')}
                                >
                                  Mark Paid
                                </button>
                                <button
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-200 border border-amber-400/35 disabled:opacity-50"
                                  disabled={isBusy || ticketStatus === 'open'}
                                  onClick={() => handleRealEstateTicketStatus(withdrawal.id, 'open')}
                                >
                                  Reopen
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
        <h2 className="text-white font-semibold text-lg mb-4">Activity Log</h2>
        {activity.length === 0 ? (
          <div className="text-white/60 text-sm">No activity recorded yet.</div>
        ) : (
          <div className="space-y-3">
            {activity.map(item => (
              <div key={item.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <div className="text-white font-semibold">{item.title}</div>
                  <div className="text-white/60 text-sm">{item.detail}</div>
                </div>
                <div className="text-white/40 text-xs">{formatDate(item.timestamp)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
