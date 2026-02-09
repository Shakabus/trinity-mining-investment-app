'use client'

import { useMemo, useState } from 'react'
import LoadingButton from '@/components/ui/LoadingButton'
import { useToast } from '@/components/ui/ToastProvider'
import { Mail, RefreshCw, CheckCircle2 } from 'lucide-react'

type ContactLead = {
  ticketId: number
  status: string
  subject: string
  fullName: string
  email: string
  phone: string
  message: string
  sourcePage: string
  createdAt: string
}

interface ContactLeadsInboxClientProps {
  leads: ContactLead[]
}

const statusLabel = (status: string) => {
  if (status === 'closed') return 'Resolved'
  if (status === 'waiting') return 'Awaiting visitor'
  return 'New'
}

export default function ContactLeadsInboxClient({ leads: initialLeads }: ContactLeadsInboxClientProps) {
  const { showToast } = useToast()
  const [leads, setLeads] = useState<ContactLead[]>(initialLeads)
  const [activeId, setActiveId] = useState<number | null>(initialLeads[0]?.ticketId ?? null)
  const [isUpdating, setIsUpdating] = useState(false)

  const activeLead = useMemo(
    () => leads.find(lead => lead.ticketId === activeId) ?? null,
    [leads, activeId],
  )

  const updateStatus = async (status: string) => {
    if (!activeLead) return
    setIsUpdating(true)
    try {
      const response = await fetch('/api/admin/support/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: activeLead.ticketId, status }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        showToast(payload?.error || 'Failed to update status.', 'error')
        return
      }

      setLeads(prev =>
        prev.map(lead =>
          lead.ticketId === activeLead.ticketId ? { ...lead, status: payload.status || status } : lead,
        ),
      )
      showToast('Status updated.', 'success')
    } catch (error) {
      console.error('Contact status update error:', error)
      showToast('Network error. Please try again.', 'error')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-white">Contact Messages</h2>
        <p className="text-white/70 mt-1">
          Visitor messages from the public contact page. Use the email link to reply directly.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
        <div
          className="p-4 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.02))',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          {leads.length === 0 ? (
            <div className="text-sm text-white/60">No contact messages yet.</div>
          ) : (
            <div className="space-y-2">
              {leads.map(lead => (
                <button
                  key={lead.ticketId}
                  onClick={() => setActiveId(lead.ticketId)}
                  className="w-full text-left px-3 py-3 rounded-xl transition-all"
                  style={{
                    background:
                      lead.ticketId === activeId
                        ? 'linear-gradient(135deg, rgba(88, 45, 255, 0.3), rgba(58, 19, 122, 0.2))'
                        : 'rgba(255, 255, 255, 0.04)',
                    border:
                      lead.ticketId === activeId
                        ? '1px solid rgba(88, 45, 255, 0.6)'
                        : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div className="text-white font-medium text-sm">{lead.fullName}</div>
                  <div className="text-xs text-white/60 mt-1">{lead.subject}</div>
                  <div className="text-xs text-white/50 mt-1">{statusLabel(lead.status)}</div>
                </button>
              ))}
            </div>
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
          {!activeLead ? (
            <div className="text-white/60 text-sm">Select a contact message to view details.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-white text-xl font-semibold">{activeLead.subject}</div>
                  <div className="text-sm text-white/65 mt-1">
                    Received {new Date(activeLead.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <LoadingButton
                    onClick={() => updateStatus('closed')}
                    isLoading={isUpdating}
                    loadingText="Updating..."
                    className="px-3 py-2 rounded-full text-xs font-semibold"
                    style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      color: '#bbf7d0',
                    }}
                  >
                    <CheckCircle2 size={14} />
                    Resolve
                  </LoadingButton>
                  <LoadingButton
                    onClick={() => updateStatus('open')}
                    isLoading={isUpdating}
                    loadingText="Updating..."
                    className="px-3 py-2 rounded-full text-xs font-semibold"
                    style={{
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      color: '#bfdbfe',
                    }}
                  >
                    <RefreshCw size={14} />
                    Reopen
                  </LoadingButton>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-white/60 text-xs uppercase tracking-wide">Name</div>
                  <div className="text-white mt-1">{activeLead.fullName}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-white/60 text-xs uppercase tracking-wide">Email</div>
                  <a className="text-blue-200 mt-1 inline-block" href={`mailto:${activeLead.email}`}>
                    {activeLead.email}
                  </a>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-white/60 text-xs uppercase tracking-wide">Phone</div>
                  <div className="text-white mt-1">{activeLead.phone || 'Not provided'}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-white/60 text-xs uppercase tracking-wide">Source</div>
                  <div className="text-white mt-1">{activeLead.sourcePage}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-white/60 text-xs uppercase tracking-wide mb-2">Message</div>
                <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap">
                  {activeLead.message}
                </p>
              </div>

              <a
                href={`mailto:${activeLead.email}?subject=${encodeURIComponent(`Re: ${activeLead.subject}`)}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.08))',
                  border: '1px solid rgba(255,255,255,0.28)',
                  color: '#ffffff',
                }}
              >
                <Mail size={15} />
                Reply by Email
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
