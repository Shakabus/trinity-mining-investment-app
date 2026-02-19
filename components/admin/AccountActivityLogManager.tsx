'use client'

import { useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import LoadingButton from '@/components/ui/LoadingButton'
import { useToast } from '@/components/ui/ToastProvider'

type ActivityLogRow = {
  id: number
  userId: number
  userName: string
  userEmail: string
  action: string
  detail: string | null
  createdAt: string
}

type Props = {
  logs: ActivityLogRow[]
}

export default function AccountActivityLogManager({ logs }: Props) {
  const router = useRouter()
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [notifyUser, setNotifyUser] = useState(false)
  const [removingLogId, setRemovingLogId] = useState<number | null>(null)

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return logs
    return logs.filter(log => {
      const row = `${log.userName} ${log.userEmail} ${log.action} ${log.detail || ''}`.toLowerCase()
      return row.includes(normalized) || String(log.userId).includes(normalized)
    })
  }, [logs, query])

  const removeLog = async (logId: number) => {
    const reason = window.prompt('Reason for deletion (optional):', 'Wrong account activity entry') || 'Wrong account activity entry'
    try {
      setRemovingLogId(logId)
      const response = await fetch('/api/admin/account-balance/operations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: logId,
          reason,
          logType: 'activity',
          notifyUser,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Failed to delete activity log.')
      }

      showToast('Account activity log removed.', 'success')
      router.refresh()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to delete activity log.', 'error')
    } finally {
      setRemovingLogId(null)
    }
  }

  return (
    <div
      className="p-5 rounded-2xl space-y-4"
      style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.5), rgba(15, 23, 42, 0.2))',
        border: '1px solid rgba(148, 163, 184, 0.25)',
      }}
    >
      <div>
        <h3 className="text-lg font-semibold text-white">Account Activity Log Controls</h3>
        <p className="text-sm text-white/65 mt-1">
          Delete incorrect account-related user activity entries.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Filter by user, action, or detail..."
          className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/45"
        />
        <label className="flex items-center gap-2 text-xs text-white/75 px-1">
          <input
            type="checkbox"
            checked={notifyUser}
            onChange={event => setNotifyUser(event.target.checked)}
            className="h-4 w-4 rounded border border-white/25 bg-white/10"
          />
          Send replacement log to user
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-white/60">No matching account activity logs.</div>
      ) : (
        <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
          {filtered.map(log => (
            <div
              key={log.id}
              className="rounded-lg px-3 py-2.5 flex flex-wrap items-start justify-between gap-3"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.10)',
              }}
            >
              <div className="min-w-0">
                <div className="text-sm text-white font-medium">
                  {log.userName}{' '}
                  <span className="text-white/55 text-xs">({log.userEmail || `User #${log.userId}`})</span>
                </div>
                <div className="text-xs text-cyan-200/90 mt-0.5">{log.action}</div>
                <div className="text-xs text-white/65 mt-1">{log.detail || 'No details recorded.'}</div>
                <div className="text-[11px] text-white/45 mt-1">{new Date(log.createdAt).toLocaleString()}</div>
              </div>
              <LoadingButton
                onClick={() => removeLog(log.id)}
                isLoading={removingLogId === log.id}
                loadingText="Deleting..."
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(252, 165, 165, 0.4)',
                  color: '#fecaca',
                }}
              >
                <Trash2 size={14} />
                Delete Log
              </LoadingButton>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

