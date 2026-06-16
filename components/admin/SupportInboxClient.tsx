'use client'

import { useMemo, useState } from 'react'
import LoadingButton from '@/components/ui/LoadingButton'
import { useToast } from '@/components/ui/ToastProvider'
import { MessageCircle, Send, CheckCircle, RefreshCw } from 'lucide-react'

type SupportMessage = {
  id: number
  senderRole: 'user' | 'support'
  body: string
  createdAt: string
  attachmentUrl?: string | null
  attachmentName?: string | null
  attachmentType?: string | null
}

type SupportTicket = {
  id: number
  subject: string
  status: string
  createdAt: string
  lastMessageAt: string | null
  user: {
    id: number
    fullName: string | null
    email: string
  }
  messages: SupportMessage[]
}

interface SupportInboxClientProps {
  tickets: SupportTicket[]
}

const statusLabel = (status: string) => {
  if (status === 'closed') return 'Closed'
  if (status === 'waiting') return 'Waiting on user'
  if (status === 'rejected') return 'Rejected'
  return 'Open'
}

export default function SupportInboxClient({ tickets: initialTickets }: SupportInboxClientProps) {
  const { showToast } = useToast()
  const [tickets, setTickets] = useState<SupportTicket[]>(initialTickets)
  const [activeId, setActiveId] = useState<number | null>(initialTickets[0]?.id ?? null)
  const [reply, setReply] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const activeTicket = useMemo(
    () => tickets.find(ticket => ticket.id === activeId) ?? null,
    [tickets, activeId]
  )

  const handleSendReply = async () => {
    if (!activeTicket) return
    const trimmed = reply.trim()
    if (!trimmed) {
      showToast('Message cannot be empty.', 'error')
      return
    }

    setIsSending(true)
    try {
      const response = await fetch('/api/admin/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: activeTicket.id,
          message: trimmed,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        showToast(payload?.error || 'Failed to send reply.', 'error')
        return
      }

      const newMessage = payload.message as SupportMessage
      setTickets(prev =>
        prev.map(ticket =>
          ticket.id === activeTicket.id
            ? {
                ...ticket,
                status: payload.status || ticket.status,
                lastMessageAt: newMessage.createdAt,
                messages: [...ticket.messages, newMessage],
              }
            : ticket
        )
      )
      setReply('')
      showToast('Reply sent.', 'success')
    } catch (error) {
      console.error('Support reply error:', error)
      showToast('Network error. Please try again.', 'error')
    } finally {
      setIsSending(false)
    }
  }

  const handleStatusChange = async (status: string) => {
    if (!activeTicket) return
    setIsUpdating(true)
    try {
      const response = await fetch('/api/admin/support/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: activeTicket.id,
          status,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        showToast(payload?.error || 'Failed to update status.', 'error')
        return
      }

      setTickets(prev =>
        prev.map(ticket =>
          ticket.id === activeTicket.id ? { ...ticket, status: payload.status || status } : ticket
        )
      )
      showToast('Status updated.', 'success')
    } catch (error) {
      console.error('Update status error:', error)
      showToast('Network error. Please try again.', 'error')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Support Inbox</h1>
        <p className="text-white/70">Review and respond to support requests.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
        <div
          className="p-4 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.02))',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="flex items-center gap-2 text-white/80 text-sm mb-4">
            <MessageCircle size={16} />
            Requests
          </div>
          {tickets.length === 0 ? (
            <div className="text-sm text-white/60">No requests yet.</div>
          ) : (
            <div className="space-y-2">
              {tickets.map(ticket => {
                const isActive = ticket.id === activeId
                const label = ticket.user.fullName || ticket.user.email
                return (
                  <button
                    key={ticket.id}
                    onClick={() => setActiveId(ticket.id)}
                    className="w-full text-left px-3 py-3 rounded-xl transition-all"
                    style={{
                      background: isActive
                        ? 'linear-gradient(135deg, rgba(88, 45, 255, 0.3), rgba(58, 19, 122, 0.2))'
                        : 'rgba(255, 255, 255, 0.04)',
                      border: isActive ? '1px solid rgba(88, 45, 255, 0.6)' : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <div className="text-white font-medium text-sm mb-1">{ticket.subject}</div>
                    <div className="text-xs text-white/60">{label}</div>
                    <div className="text-xs text-white/50 mt-1">{statusLabel(ticket.status)}</div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div
          className="p-6 rounded-3xl flex flex-col"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          {!activeTicket ? (
            <div className="text-white/60 text-sm">Select a request to view messages.</div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div>
                  <div className="text-white font-semibold">{activeTicket.subject}</div>
                  <div className="text-xs text-white/60">
                    {activeTicket.user.fullName || activeTicket.user.email}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <LoadingButton
                    onClick={() => handleStatusChange('closed')}
                    isLoading={isUpdating}
                    loadingText="Updating..."
                    className="px-3 py-2 rounded-full text-xs font-semibold"
                    style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      color: '#bbf7d0',
                    }}
                  >
                    <CheckCircle size={14} />
                    Close
                  </LoadingButton>
                  <LoadingButton
                    onClick={() => handleStatusChange('open')}
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
                  <span className="text-xs text-white/50">{statusLabel(activeTicket.status)}</span>
                </div>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                {activeTicket.messages.map(msg => {
                  const isSupport = msg.senderRole === 'support'
                  return (
                    <div
                      key={msg.id}
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                        isSupport ? 'ml-auto' : 'mr-auto'
                      }`}
                      style={{
                        background: isSupport
                          ? 'linear-gradient(135deg, rgba(88, 45, 255, 0.35), rgba(58, 19, 122, 0.25))'
                          : 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#ffffff',
                      }}
                    >
                    <div>{msg.body}</div>
                    {msg.attachmentUrl && (
                      <div className="mt-2">
                        <a
                          href={msg.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-200 hover:text-blue-100 underline"
                        >
                          View attachment{msg.attachmentName ? `: ${msg.attachmentName}` : ''}
                        </a>
                      </div>
                    )}
                    <div className="text-[11px] text-white/50 mt-2">
                      {new Date(msg.createdAt).toLocaleString()}
                    </div>
                    </div>
                  )
                })}
              </div>

              <div className="pt-4 border-t border-white/10 mt-4">
                <div className="flex items-center gap-2">
                  <input
                    value={reply}
                    onChange={event => setReply(event.target.value)}
                    className="flex-1 px-4 py-3 rounded-full bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:border-purple-500 focus:outline-none"
                    placeholder="Write a reply"
                  />
                  <LoadingButton
                    onClick={handleSendReply}
                    isLoading={isSending}
                    loadingText="Sending..."
                    className="px-4 py-3 rounded-full font-semibold flex items-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, #582dff, #3a137a)',
                      color: '#ffffff',
                    }}
                  >
                    <Send size={16} />
                    Send
                  </LoadingButton>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
