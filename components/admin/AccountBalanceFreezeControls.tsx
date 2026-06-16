'use client'

import { useEffect, useMemo, useState } from 'react'
import LoadingButton from '@/components/ui/LoadingButton'
import { useToast } from '@/components/ui/ToastProvider'

type UserOption = {
  id: number
  name: string
  email: string
}

type FreezeSettings = {
  userId: number
  freezeIncomingAll: boolean
  freezeOutgoingAll: boolean
  accountIncomingFreezeUsd: number
  accountOutgoingFreezeUsd: number
  btcIncomingFreezeUsd: number
  btcOutgoingFreezeUsd: number
  ethIncomingFreezeUsd: number
  ethOutgoingFreezeUsd: number
  usdtIncomingFreezeUsd: number
  usdtOutgoingFreezeUsd: number
  solIncomingFreezeUsd: number
  solOutgoingFreezeUsd: number
  spendableFundsLocked: boolean
  withdrawableFundsLocked: boolean
  earningsLocked: boolean
  walletFundsLocked: boolean
  note: string | null
}

type FreezeAmountField =
  | 'btcIncomingFreezeUsd'
  | 'btcOutgoingFreezeUsd'
  | 'ethIncomingFreezeUsd'
  | 'ethOutgoingFreezeUsd'
  | 'usdtIncomingFreezeUsd'
  | 'usdtOutgoingFreezeUsd'
  | 'solIncomingFreezeUsd'
  | 'solOutgoingFreezeUsd'

type FreezeToggleField =
  | 'spendableFundsLocked'
  | 'withdrawableFundsLocked'
  | 'earningsLocked'
  | 'walletFundsLocked'

type Props = {
  users: UserOption[]
}

const COIN_ROWS: Array<{
  coin: 'BTC' | 'ETH' | 'USDT' | 'SOL'
  incomingKey: FreezeAmountField
  outgoingKey: FreezeAmountField
}> = [
  { coin: 'BTC', incomingKey: 'btcIncomingFreezeUsd', outgoingKey: 'btcOutgoingFreezeUsd' },
  { coin: 'ETH', incomingKey: 'ethIncomingFreezeUsd', outgoingKey: 'ethOutgoingFreezeUsd' },
  { coin: 'USDT', incomingKey: 'usdtIncomingFreezeUsd', outgoingKey: 'usdtOutgoingFreezeUsd' },
  { coin: 'SOL', incomingKey: 'solIncomingFreezeUsd', outgoingKey: 'solOutgoingFreezeUsd' },
]

const METRIC_LOCK_ROWS: Array<{
  key: FreezeToggleField
  label: string
  description: string
}> = [
  {
    key: 'spendableFundsLocked',
    label: 'Spendable funds',
    description: 'Blocks plan purchases from account balance.',
  },
  {
    key: 'withdrawableFundsLocked',
    label: 'Withdrawable funds',
    description: 'Blocks all withdrawal requests from account balance.',
  },
  {
    key: 'earningsLocked',
    label: 'Earnings credits',
    description: 'Blocks matured earnings from crediting into account balance.',
  },
  {
    key: 'walletFundsLocked',
    label: 'Wallet funds',
    description: 'Blocks wallet conversions and coin-based outflows.',
  },
]

function toNumber(value: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return Number(parsed.toFixed(2))
}

function emptySettings(userId: number): FreezeSettings {
  return {
    userId,
    freezeIncomingAll: false,
    freezeOutgoingAll: false,
    accountIncomingFreezeUsd: 0,
    accountOutgoingFreezeUsd: 0,
    btcIncomingFreezeUsd: 0,
    btcOutgoingFreezeUsd: 0,
    ethIncomingFreezeUsd: 0,
    ethOutgoingFreezeUsd: 0,
    usdtIncomingFreezeUsd: 0,
    usdtOutgoingFreezeUsd: 0,
    solIncomingFreezeUsd: 0,
    solOutgoingFreezeUsd: 0,
    spendableFundsLocked: false,
    withdrawableFundsLocked: false,
    earningsLocked: false,
    walletFundsLocked: false,
    note: '',
  }
}

export default function AccountBalanceFreezeControls({ users }: Props) {
  const { showToast } = useToast()
  const [selectedUserId, setSelectedUserId] = useState<number | null>(users[0]?.id ?? null)
  const [settings, setSettings] = useState<FreezeSettings | null>(null)
  const [notifyUser, setNotifyUser] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [tableMissing, setTableMissing] = useState(false)

  const selectedUser = useMemo(
    () => users.find(user => user.id === selectedUserId) ?? null,
    [selectedUserId, users]
  )

  useEffect(() => {
    if (!selectedUserId) return

    let isActive = true
    const controller = new AbortController()

    const load = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/admin/account-balance/freeze-controls?userId=${selectedUserId}`, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        })

        if (!isActive) return

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          if (payload?.code === 'FREEZE_TABLE_MISSING') {
            setTableMissing(true)
            setSettings(emptySettings(selectedUserId))
            return
          }
          throw new Error(payload?.error || 'Unable to load freeze controls.')
        }

        const payload = (await response.json()) as { settings?: FreezeSettings }
        setTableMissing(false)
        setSettings(payload.settings ?? emptySettings(selectedUserId))
      } catch (error) {
        if (!isActive || controller.signal.aborted) return
        showToast(error instanceof Error ? error.message : 'Unable to load freeze controls.', 'error')
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    void load()

    return () => {
      isActive = false
      controller.abort()
    }
  }, [selectedUserId, showToast])

  const handleSave = async () => {
    if (!settings || !selectedUserId) return
    try {
      setIsSaving(true)
      const response = await fetch('/api/admin/account-balance/freeze-controls', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          freezeIncomingAll: settings.freezeIncomingAll,
          freezeOutgoingAll: settings.freezeOutgoingAll,
          accountIncomingFreezeUsd: settings.accountIncomingFreezeUsd,
          accountOutgoingFreezeUsd: settings.accountOutgoingFreezeUsd,
          btcIncomingFreezeUsd: settings.btcIncomingFreezeUsd,
          btcOutgoingFreezeUsd: settings.btcOutgoingFreezeUsd,
          ethIncomingFreezeUsd: settings.ethIncomingFreezeUsd,
          ethOutgoingFreezeUsd: settings.ethOutgoingFreezeUsd,
          usdtIncomingFreezeUsd: settings.usdtIncomingFreezeUsd,
          usdtOutgoingFreezeUsd: settings.usdtOutgoingFreezeUsd,
          solIncomingFreezeUsd: settings.solIncomingFreezeUsd,
          solOutgoingFreezeUsd: settings.solOutgoingFreezeUsd,
          spendableFundsLocked: settings.spendableFundsLocked,
          withdrawableFundsLocked: settings.withdrawableFundsLocked,
          earningsLocked: settings.earningsLocked,
          walletFundsLocked: settings.walletFundsLocked,
          note: settings.note || '',
          notifyUser,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to save freeze controls.')
      }

      setTableMissing(false)
      setSettings((payload?.settings as FreezeSettings | undefined) ?? settings)
      showToast('Freeze controls updated.', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to save freeze controls.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  if (!users.length) {
    return <div className="text-sm text-white/60">No users available for freeze controls.</div>
  }

  return (
    <div
      className="rounded-xl p-4 space-y-4"
      style={{
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
      }}
    >
      <div>
        <h3 className="text-lg font-semibold text-white">Account Freeze Controls</h3>
        <p className="text-sm text-white/65 mt-1">
          Freeze incoming/outgoing flows globally or by wallet. Outgoing freeze amounts act as reserved funds.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,280px)_1fr] gap-3">
        <select
          value={selectedUser?.id ?? ''}
          onChange={event => setSelectedUserId(Number(event.target.value))}
          className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-white"
        >
          {users.map(user => (
            <option key={user.id} value={user.id} className="bg-zinc-900">
              {user.name} ({user.email || `User #${user.id}`})
            </option>
          ))}
        </select>
        <div className="text-xs text-white/55 self-center">
          {selectedUser ? `Editing freeze controls for ${selectedUser.name}` : 'Select a user.'}
        </div>
      </div>

      {tableMissing ? (
        <div
          className="rounded-lg px-3 py-2 text-sm"
          style={{
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.45)',
            color: '#fde68a',
          }}
        >
          Freeze controls are not available until the new database migration is applied.
        </div>
      ) : null}

      {isLoading || !settings ? (
        <div className="text-sm text-white/60">Loading freeze controls...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 flex items-center justify-between gap-3">
              <span className="text-sm text-white">Freeze all incoming</span>
              <input
                type="checkbox"
                checked={settings.freezeIncomingAll}
                onChange={event =>
                  setSettings(current =>
                    current ? { ...current, freezeIncomingAll: event.target.checked } : current
                  )
                }
              />
            </label>
            <label className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 flex items-center justify-between gap-3">
              <span className="text-sm text-white">Freeze all outgoing</span>
              <input
                type="checkbox"
                checked={settings.freezeOutgoingAll}
                onChange={event =>
                  setSettings(current =>
                    current ? { ...current, freezeOutgoingAll: event.target.checked } : current
                  )
                }
              />
            </label>
          </div>

          <div
            className="rounded-lg border border-white/12 overflow-hidden"
            style={{ background: 'rgba(255, 255, 255, 0.03)' }}
          >
            <div className="px-3 py-2 border-b border-white/10 text-[11px] uppercase tracking-wide text-white/55">
              Asset Locks
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3">
              {METRIC_LOCK_ROWS.map(item => (
                <label
                  key={item.key}
                  className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-sm text-white">{item.label}</div>
                    <div className="text-[11px] text-white/55">{item.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{
                        background: settings[item.key]
                          ? 'rgba(239, 68, 68, 0.18)'
                          : 'rgba(16, 185, 129, 0.18)',
                        color: settings[item.key] ? '#fca5a5' : '#86efac',
                        border: settings[item.key]
                          ? '1px solid rgba(248, 113, 113, 0.45)'
                          : '1px solid rgba(52, 211, 153, 0.45)',
                      }}
                    >
                      {settings[item.key] ? 'LOCKED' : 'ACTIVE'}
                    </span>
                    <input
                      type="checkbox"
                      checked={settings[item.key]}
                      onChange={event =>
                        setSettings(current =>
                          current ? { ...current, [item.key]: event.target.checked } : current
                        )
                      }
                    />
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white">
              <div className="text-white/75 mb-1">Account incoming freeze (USD)</div>
              <input
                type="number"
                min={0}
                step="0.01"
                value={settings.accountIncomingFreezeUsd}
                onChange={event =>
                  setSettings(current =>
                    current
                      ? { ...current, accountIncomingFreezeUsd: toNumber(event.target.value) }
                      : current
                  )
                }
                className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white">
              <div className="text-white/75 mb-1">Account outgoing freeze (USD)</div>
              <input
                type="number"
                min={0}
                step="0.01"
                value={settings.accountOutgoingFreezeUsd}
                onChange={event =>
                  setSettings(current =>
                    current
                      ? { ...current, accountOutgoingFreezeUsd: toNumber(event.target.value) }
                      : current
                  )
                }
                className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
              />
            </label>
          </div>

          <div
            className="rounded-lg border border-white/12 overflow-hidden"
            style={{ background: 'rgba(255, 255, 255, 0.03)' }}
          >
            <div className="grid grid-cols-[120px_1fr_1fr] text-[11px] uppercase tracking-wide text-white/55 border-b border-white/10">
              <div className="px-3 py-2">Wallet</div>
              <div className="px-3 py-2">Incoming Freeze (USD)</div>
              <div className="px-3 py-2">Outgoing Freeze (USD)</div>
            </div>
            {COIN_ROWS.map(row => (
              <div
                key={row.coin}
                className="grid grid-cols-[120px_1fr_1fr] border-b border-white/10 last:border-b-0"
              >
                <div className="px-3 py-2 text-sm text-white font-medium">{row.coin}</div>
                <div className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={settings[row.incomingKey] as number}
                    onChange={event =>
                      setSettings(current =>
                        current
                          ? { ...current, [row.incomingKey]: toNumber(event.target.value) }
                          : current
                      )
                    }
                    className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-1.5 text-sm text-white"
                  />
                </div>
                <div className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={settings[row.outgoingKey] as number}
                    onChange={event =>
                      setSettings(current =>
                        current
                          ? { ...current, [row.outgoingKey]: toNumber(event.target.value) }
                          : current
                      )
                    }
                    className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-1.5 text-sm text-white"
                  />
                </div>
              </div>
            ))}
          </div>

          <label className="block">
            <div className="text-xs text-white/65 mb-1">Admin note (optional)</div>
            <textarea
              value={settings.note || ''}
              onChange={event =>
                setSettings(current => (current ? { ...current, note: event.target.value } : current))
              }
              rows={3}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
              placeholder="Reason for freeze controls"
            />
          </label>

          <label className="inline-flex items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={notifyUser}
              onChange={event => setNotifyUser(event.target.checked)}
            />
            Forward this freeze update to the user activity log
          </label>

          <div className="flex justify-end">
            <LoadingButton
              onClick={handleSave}
              isLoading={isSaving}
              loadingText="Saving..."
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: '#2563eb', color: '#fff' }}
            >
              Save Freeze Controls
            </LoadingButton>
          </div>
        </>
      )}
    </div>
  )
}
