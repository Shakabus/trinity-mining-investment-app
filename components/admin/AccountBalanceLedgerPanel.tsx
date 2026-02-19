'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import LoadingButton from '@/components/ui/LoadingButton'
import { useToast } from '@/components/ui/ToastProvider'

type AccountBalanceHistoryRow = {
  id: string
  createdAt: string
  direction: 'credit' | 'debit'
  status: 'pending' | 'settled' | 'rejected'
  amountUsd: number
  sourceLabel: string
  note: string | null
  coinType: string | null
}

type UserBalanceSummary = {
  userId: number
  userName: string
  userEmail: string
  balanceUsd: number
  availableUsd: number
  pendingCreditsUsd: number
  pendingDebitsUsd: number
  totalDepositsUsd: number
  totalWithdrawalsUsd: number
  totalInvestedUsd: number
  totalCreditsUsd: number
  totalDebitsUsd: number
  totalProfitUsd: number
  topReturnLabel: string | null
  topReturnUsd: number
  topMiningPlanLabel: string | null
  topMiningPlanUsd: number
  topTradingPlanLabel: string | null
  topTradingPlanUsd: number
  topPropertyLabel: string | null
  topPropertyUsd: number
  latestAt: string | null
  history: AccountBalanceHistoryRow[]
}

type EditableMetricKey =
  | 'balanceUsd'
  | 'availableUsd'
  | 'totalDepositsUsd'
  | 'totalWithdrawalsUsd'
  | 'totalCreditsUsd'
  | 'totalDebitsUsd'

type Props = {
  summaries: UserBalanceSummary[]
}

function formatUsd(value: number) {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const EDITABLE_LABELS: Record<EditableMetricKey, string> = {
  balanceUsd: 'Balance',
  availableUsd: 'Available',
  totalDepositsUsd: 'Deposits',
  totalWithdrawalsUsd: 'Withdrawn',
  totalCreditsUsd: 'Net Credits',
  totalDebitsUsd: 'Net Debits',
}

export default function AccountBalanceLedgerPanel({ summaries }: Props) {
  const router = useRouter()
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<number | null>(summaries[0]?.userId ?? null)
  const [editMetric, setEditMetric] = useState<EditableMetricKey | null>(null)
  const [editMode, setEditMode] = useState<'increase' | 'decrease'>('increase')
  const [editAmount, setEditAmount] = useState('')
  const [editNote, setEditNote] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return summaries
    return summaries.filter(item => {
      const name = item.userName.toLowerCase()
      const email = item.userEmail.toLowerCase()
      return name.includes(normalized) || email.includes(normalized) || String(item.userId).includes(normalized)
    })
  }, [query, summaries])

  const selectedSummary = useMemo(() => {
    if (!selectedUserId) return filtered[0] ?? null
    return filtered.find(item => item.userId === selectedUserId) ?? filtered[0] ?? null
  }, [filtered, selectedUserId])

  const submitMetricEdit = async () => {
    if (!selectedSummary || !editMetric) return
    const amountUsd = Number(editAmount)
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      showToast('Enter a valid amount greater than zero.', 'error')
      return
    }

    try {
      setIsSavingEdit(true)
      const response = await fetch('/api/admin/account-balance/ledger-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedSummary.userId,
          metric: editMetric,
          mode: editMode,
          amountUsd,
          note: editNote.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Unable to save ledger edit.')
      }

      showToast('Ledger metric updated.', 'success')
      setEditAmount('')
      setEditNote('')
      setEditMetric(null)
      router.refresh()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to save ledger edit.', 'error')
    } finally {
      setIsSavingEdit(false)
    }
  }

  if (summaries.length === 0) {
    return <div className="text-sm text-white/60">No users found.</div>
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,280px)_1fr] gap-3">
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search user name or email..."
          className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/45"
        />
        <select
          value={selectedSummary?.userId ?? ''}
          onChange={event => setSelectedUserId(Number(event.target.value))}
          className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-white"
        >
          {filtered.map(item => (
            <option key={item.userId} value={item.userId} className="bg-zinc-900">
              {item.userName} ({item.userEmail || `User #${item.userId}`})
            </option>
          ))}
        </select>
      </div>

      {selectedSummary ? (
        <div
          className="rounded-xl p-4"
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-white font-semibold">{selectedSummary.userName}</div>
              <div className="text-xs text-white/60">{selectedSummary.userEmail || `User #${selectedSummary.userId}`}</div>
              <div className="text-[11px] text-white/45 mt-1">
                Last ledger update:{' '}
                {selectedSummary.latestAt ? new Date(selectedSummary.latestAt).toLocaleString() : 'N/A'}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/admin/users/${selectedSummary.userId}`}
                className="px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                style={{
                  background: 'rgba(59, 130, 246, 0.25)',
                  border: '1px solid rgba(147, 197, 253, 0.45)',
                }}
              >
                Open User
              </Link>
              <a
                href="#manual-adjustments"
                className="px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid rgba(110, 231, 183, 0.45)',
                }}
              >
                Adjust Balance
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mt-4 text-xs">
            <LedgerMetricCard
              label="Balance"
              value={selectedSummary.balanceUsd}
              positive
              editable
              onEdit={() => setEditMetric('balanceUsd')}
            />
            <LedgerMetricCard
              label="Available"
              value={selectedSummary.availableUsd}
              positive
              editable
              onEdit={() => setEditMetric('availableUsd')}
            />
            <LedgerMetricCard label="Pending +" value={selectedSummary.pendingCreditsUsd} />
            <LedgerMetricCard label="Pending -" value={selectedSummary.pendingDebitsUsd} />
            <LedgerMetricCard
              label="Deposits"
              value={selectedSummary.totalDepositsUsd}
              positive
              editable
              onEdit={() => setEditMetric('totalDepositsUsd')}
            />
            <LedgerMetricCard
              label="Withdrawn"
              value={selectedSummary.totalWithdrawalsUsd}
              editable
              onEdit={() => setEditMetric('totalWithdrawalsUsd')}
            />
            <LedgerMetricCard label="Invested" value={selectedSummary.totalInvestedUsd} />
            <LedgerMetricCard
              label="Net Debits"
              value={selectedSummary.totalDebitsUsd}
              editable
              onEdit={() => setEditMetric('totalDebitsUsd')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 mt-4">
            <InfoDial label="Total profits" value={formatUsd(selectedSummary.totalProfitUsd)} />
            <InfoDial
              label="Top return source"
              value={selectedSummary.topReturnLabel ?? 'No return source yet'}
              subValue={selectedSummary.topReturnUsd > 0 ? formatUsd(selectedSummary.topReturnUsd) : null}
            />
            <InfoDial
              label="Top mining package"
              value={selectedSummary.topMiningPlanLabel ?? 'No mining returns yet'}
              subValue={selectedSummary.topMiningPlanUsd > 0 ? formatUsd(selectedSummary.topMiningPlanUsd) : null}
            />
            <InfoDial
              label="Top trading package"
              value={selectedSummary.topTradingPlanLabel ?? 'No trading returns yet'}
              subValue={selectedSummary.topTradingPlanUsd > 0 ? formatUsd(selectedSummary.topTradingPlanUsd) : null}
            />
            <InfoDial
              label="Top property return"
              value={selectedSummary.topPropertyLabel ?? 'No property returns yet'}
              subValue={selectedSummary.topPropertyUsd > 0 ? formatUsd(selectedSummary.topPropertyUsd) : null}
            />
            <InfoDial
              label="Net credits"
              value={formatUsd(selectedSummary.totalCreditsUsd)}
              editable
              onEdit={() => setEditMetric('totalCreditsUsd')}
            />
          </div>

          {editMetric ? (
            <div
              className="rounded-xl p-3 mt-4 space-y-3"
              style={{
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(147, 197, 253, 0.35)',
              }}
            >
              <div className="text-sm text-white font-medium">
                Edit {EDITABLE_LABELS[editMetric]} for {selectedSummary.userName}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <select
                  value={editMode}
                  onChange={event => setEditMode(event.target.value as 'increase' | 'decrease')}
                  className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
                >
                  <option value="increase" className="bg-zinc-900">
                    Increase
                  </option>
                  <option value="decrease" className="bg-zinc-900">
                    Decrease
                  </option>
                </select>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={editAmount}
                  onChange={event => setEditAmount(event.target.value)}
                  placeholder="Amount (USD)"
                  className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
                />
                <input
                  type="text"
                  value={editNote}
                  onChange={event => setEditNote(event.target.value)}
                  placeholder="Note (optional)"
                  className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
                />
                <div className="flex gap-2">
                  <LoadingButton
                    onClick={submitMetricEdit}
                    isLoading={isSavingEdit}
                    loadingText="Saving..."
                    className="px-3 py-2 rounded-lg text-xs font-semibold"
                    style={{ background: '#2563eb', color: '#fff' }}
                  >
                    Apply
                  </LoadingButton>
                  <button
                    type="button"
                    onClick={() => setEditMetric(null)}
                    className="px-3 py-2 rounded-lg text-xs font-semibold text-white/80 border border-white/20"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-white/80 hover:text-white">
              View recent account-balance history ({selectedSummary.history.length})
            </summary>
            <div className="mt-3 space-y-2">
              {selectedSummary.history.map(item => (
                <div
                  key={item.id}
                  className="rounded-lg px-3 py-2 flex flex-wrap items-center justify-between gap-2"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div className="min-w-0">
                    <div className="text-xs text-white/85">
                      {item.sourceLabel}
                      {item.coinType ? ` (${item.coinType})` : ''}
                    </div>
                    <div className="text-[11px] text-white/55">
                      {new Date(item.createdAt).toLocaleString()} - {item.status.toUpperCase()}
                      {item.note ? ` - ${item.note}` : ''}
                    </div>
                  </div>
                  <div
                    className={`text-sm font-semibold ${
                      item.direction === 'credit' ? 'text-emerald-300' : 'text-rose-300'
                    }`}
                  >
                    {item.direction === 'credit' ? '+' : '-'}
                    {formatUsd(item.amountUsd)}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      ) : (
        <div className="text-sm text-white/60">No users match your search.</div>
      )}
    </div>
  )
}

function InfoDial({
  label,
  value,
  subValue,
  editable,
  onEdit,
}: {
  label: string
  value: string
  subValue?: string | null
  editable?: boolean
  onEdit?: () => void
}) {
  return (
    <div
      className="rounded-lg px-3 py-3"
      style={{
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div className="text-[11px] text-white/60 uppercase tracking-wide flex items-center justify-between gap-2">
        <span>{label}</span>
        {editable && onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 text-[10px] text-blue-200 hover:text-white"
          >
            <Pencil size={12} />
            Edit
          </button>
        ) : null}
      </div>
      <div className="text-sm text-white font-semibold mt-1">{value}</div>
      {subValue ? <div className="text-xs text-white/70 mt-0.5">{subValue}</div> : null}
    </div>
  )
}

function LedgerMetricCard({
  label,
  value,
  positive,
  editable,
  onEdit,
}: {
  label: string
  value: number
  positive?: boolean
  editable?: boolean
  onEdit?: () => void
}) {
  return (
    <div
      className="rounded-lg px-2 py-2"
      style={{
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div className="text-[10px] text-white/60 uppercase tracking-wide flex items-center justify-between gap-1">
        <span>{label}</span>
        {editable && onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 text-[10px] text-blue-200 hover:text-white"
          >
            <Pencil size={11} />
            Edit
          </button>
        ) : null}
      </div>
      <div className={`text-sm font-semibold mt-1 ${positive ? 'text-emerald-300' : 'text-white'}`}>
        {formatUsd(value)}
      </div>
    </div>
  )
}
