'use client'

import { useMemo, useState } from 'react'
import { SlidersHorizontal, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import LoadingButton from '@/components/ui/LoadingButton'
import { useToast } from '@/components/ui/ToastProvider'

type ManualUserOption = {
  id: number
  name: string
  email: string
}

type ManualAdjustmentRow = {
  entryId: number
  referenceId: string
  userId: number
  userName: string
  userEmail: string
  direction: 'credit' | 'debit'
  amountUsd: number
  coinType: string
  amountCrypto: number | null
  paymentMethod: string | null
  note: string | null
  createdAt: string
}

type Props = {
  users: ManualUserOption[]
  adjustments: ManualAdjustmentRow[]
}

const COIN_OPTIONS = ['BTC', 'ETH', 'USDT', 'SOL'] as const

export default function AccountBalanceManualAdjustments({ users, adjustments }: Props) {
  const router = useRouter()
  const { showToast } = useToast()

  const [isExpanded, setIsExpanded] = useState(false)
  const [userId, setUserId] = useState(users[0]?.id ? String(users[0].id) : '')
  const [adjustmentType, setAdjustmentType] = useState<'deposit' | 'withdrawal'>('deposit')
  const [amountUsd, setAmountUsd] = useState('')
  const [coinType, setCoinType] = useState<(typeof COIN_OPTIONS)[number]>('USDT')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [note, setNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [removingEntryId, setRemovingEntryId] = useState<number | null>(null)

  const canSubmit = useMemo(() => {
    const amount = Number(amountUsd)
    return (
      Number.isFinite(amount) &&
      amount > 0 &&
      userId.length > 0 &&
      paymentMethod.trim().length > 1
    )
  }, [amountUsd, paymentMethod, userId])

  const submitAdjustment = async () => {
    if (!canSubmit) {
      showToast('Provide user, amount, and payment method.', 'error')
      return
    }

    const notifyUser = window.confirm(
      'Forward this manual adjustment to the user activity record?\n\nClick OK = Forward\nClick Cancel = Keep internal only'
    )

    try {
      setIsSaving(true)
      const response = await fetch('/api/admin/account-balance/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: Number(userId),
          adjustmentType,
          amountUsd: Number(amountUsd),
          coinType,
          paymentMethod: paymentMethod.trim(),
          note: note.trim() || undefined,
          notifyUser,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Failed to save manual adjustment.')
      }

      showToast('Manual account-balance entry recorded.', 'success')
      setAmountUsd('')
      setPaymentMethod('')
      setNote('')
      router.refresh()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to save manual adjustment.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const removeEntry = async (entryId: number) => {
    const reason = window.prompt('Reason for removal (optional):', 'Manual correction') || 'Manual correction'
    const notifyUser = window.confirm(
      'Forward this removal to the user activity record?\n\nClick OK = Forward\nClick Cancel = Keep internal only'
    )
    try {
      setRemovingEntryId(entryId)
      const response = await fetch('/api/admin/account-balance/operations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId, reason, notifyUser, logType: 'manual_adjustment' }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Failed to remove transaction record.')
      }
      showToast('Transaction record removed.', 'success')
      router.refresh()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to remove transaction record.', 'error')
    } finally {
      setRemovingEntryId(null)
    }
  }

  return (
    <div
      className="p-5 rounded-2xl space-y-5"
      style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.14), rgba(59, 130, 246, 0.03))',
        border: '1px solid rgba(59, 130, 246, 0.3)',
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs text-blue-100/80 uppercase tracking-wide">Settings dial</div>
          <h3 className="text-xl font-semibold text-white mt-1">Manual Deposit / Withdrawal Controls</h3>
          <p className="text-sm text-blue-100/80 mt-1">
            Add custom payment records and remove mistaken manual records.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(current => !current)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold text-white"
          style={{
            background: 'rgba(59, 130, 246, 0.22)',
            border: '1px solid rgba(147, 197, 253, 0.45)',
          }}
        >
          <SlidersHorizontal size={16} />
          {isExpanded ? 'Close Dial' : 'Open Dial'}
        </button>
      </div>

      {isExpanded && (
        <div
          className="rounded-2xl p-4 md:p-5 space-y-4"
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-white/70 mb-2">User</label>
              <select
                value={userId}
                onChange={event => setUserId(event.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
              >
                {users.length === 0 ? (
                  <option value="" className="bg-zinc-900">
                    No users
                  </option>
                ) : (
                  users.map(user => (
                    <option key={user.id} value={String(user.id)} className="bg-zinc-900">
                      {user.name} ({user.email})
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/70 mb-2">Direction</label>
              <select
                value={adjustmentType}
                onChange={event => setAdjustmentType(event.target.value as 'deposit' | 'withdrawal')}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
              >
                <option value="deposit" className="bg-zinc-900">
                  Deposit (+)
                </option>
                <option value="withdrawal" className="bg-zinc-900">
                  Withdrawal (-)
                </option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/70 mb-2">Amount (USD)</label>
              <input
                type="number"
                min={1}
                step="0.01"
                value={amountUsd}
                onChange={event => setAmountUsd(event.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
                placeholder="1000"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-white/70 mb-2">Coin</label>
              <select
                value={coinType}
                onChange={event => setCoinType(event.target.value as (typeof COIN_OPTIONS)[number])}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
              >
                {COIN_OPTIONS.map(option => (
                  <option key={option} value={option} className="bg-zinc-900">
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/70 mb-2">Payment Method</label>
              <input
                type="text"
                value={paymentMethod}
                onChange={event => setPaymentMethod(event.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
                placeholder="Custom wire / OTC / Manual transfer"
              />
            </div>
            <div>
              <label className="block text-xs text-white/70 mb-2">Note (optional)</label>
              <input
                type="text"
                value={note}
                onChange={event => setNote(event.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
                placeholder="Internal comment"
              />
            </div>
          </div>

          <LoadingButton
            onClick={submitAdjustment}
            isLoading={isSaving}
            loadingText="Saving..."
            className="px-5 py-2.5 rounded-full text-sm font-semibold"
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              color: '#ffffff',
            }}
          >
            Save Custom Transaction
          </LoadingButton>

          <div className="text-[11px] text-white/60">
            Before saving or removing, you will be asked whether to forward the action to user activity.
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="text-xs text-blue-100/80 uppercase tracking-wide">Manual transaction records</div>
        {adjustments.length === 0 ? (
          <div className="text-sm text-white/65">No manual records yet.</div>
        ) : (
          <div className="space-y-2">
            {adjustments.map(row => (
              <div
                key={row.entryId}
                className="rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                }}
              >
                <div className="min-w-0">
                  <div className="text-sm text-white font-medium">
                    {row.userName}{' '}
                    <span className="text-white/55 text-xs">({row.userEmail})</span>
                  </div>
                  <div className="text-xs text-white/65 mt-0.5">
                    {row.direction === 'credit' ? 'Deposit' : 'Withdrawal'} via {row.paymentMethod || 'Manual method'} •{' '}
                    {row.coinType}
                    {row.amountCrypto ? ` (${row.amountCrypto.toFixed(8)})` : ''}
                  </div>
                  <div className="text-[11px] text-white/45 mt-1">
                    {new Date(row.createdAt).toLocaleString()} • {row.referenceId}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`text-sm font-semibold ${row.direction === 'credit' ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {row.direction === 'credit' ? '+' : '-'}$
                    {row.amountUsd.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <LoadingButton
                    onClick={() => removeEntry(row.entryId)}
                    isLoading={removingEntryId === row.entryId}
                    loadingText="Removing..."
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(252, 165, 165, 0.4)',
                      color: '#fecaca',
                    }}
                  >
                    <Trash2 size={14} />
                    Remove
                  </LoadingButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
