'use client'

import { useMemo, useState } from 'react'
import LoadingButton from '@/components/ui/LoadingButton'
import { useToast } from '@/components/ui/ToastProvider'
import { MessageCircle, Send, PlusCircle } from 'lucide-react'

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
  messages: SupportMessage[]
}

interface SupportCenterClientProps {
  tickets: SupportTicket[]
}

const statusLabel = (status: string) => {
  if (status === 'closed') return 'Closed'
  if (status === 'waiting') return 'Waiting on you'
  return 'Open'
}

export default function SupportCenterClient({ tickets: initialTickets }: SupportCenterClientProps) {
  const { showToast } = useToast()
  const [tickets, setTickets] = useState<SupportTicket[]>(initialTickets)
  const [activeId, setActiveId] = useState<number | null>(initialTickets[0]?.id ?? null)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [reply, setReply] = useState('')
  const [newAttachment, setNewAttachment] = useState<File | null>(null)
  const [replyAttachment, setReplyAttachment] = useState<File | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const activeTicket = useMemo(
    () => tickets.find(ticket => ticket.id === activeId) ?? null,
    [tickets, activeId]
  )

  const handleCreateTicket = async () => {
    const trimmedSubject = subject.trim()
    const trimmedMessage = message.trim()
    if (!trimmedSubject || !trimmedMessage) {
      showToast('Subject and message are required.', 'error')
      return
    }

    setIsCreating(true)
    try {
      const formData = new FormData()
      formData.append('subject', trimmedSubject)
      formData.append('message', trimmedMessage)
      if (newAttachment) {
        formData.append('file', newAttachment)
      }

      const response = await fetch('/api/user/support/tickets', {
        method: 'POST',
        body: formData,
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        showToast(payload?.error || 'Failed to send request.', 'error')
        return
      }

      const newTicket = payload.ticket as SupportTicket
      setTickets(prev => [newTicket, ...prev])
      setActiveId(newTicket.id)
      setSubject('')
      setMessage('')
      setNewAttachment(null)
      showToast('Request sent. You will receive a reply here.', 'success')
    } catch (error) {
      console.error('Create ticket error:', error)
      showToast('Network error. Please try again.', 'error')
    } finally {
      setIsCreating(false)
    }
  }

  const handleSendReply = async () => {
    if (!activeTicket) return
    const trimmed = reply.trim()
    if (!trimmed) {
      showToast('Message cannot be empty.', 'error')
      return
    }

    setIsSending(true)
    try {
      const formData = new FormData()
      formData.append('ticketId', String(activeTicket.id))
      formData.append('message', trimmed)
      if (replyAttachment) {
        formData.append('file', replyAttachment)
      }

      const response = await fetch('/api/user/support/messages', {
        method: 'POST',
        body: formData,
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        showToast(payload?.error || 'Failed to send message.', 'error')
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
      setReplyAttachment(null)
    } catch (error) {
      console.error('Send message error:', error)
      showToast('Network error. Please try again.', 'error')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Support</h2>
        <p className="text-white/70">Find answers, learn how things work, or send a request.</p>
      </div>

      <div
        className="p-6 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <PlusCircle size={18} />
          Start a new request
        </h3>
        <div className="space-y-4">
          <input
            value={subject}
            onChange={event => setSubject(event.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:border-purple-500 focus:outline-none"
            placeholder="Subject"
          />
          <textarea
            value={message}
            onChange={event => setMessage(event.target.value)}
            rows={4}
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:border-purple-500 focus:outline-none"
            placeholder="Describe your issue or question"
          />
          <div>
            <label className="block text-sm text-white/70 mb-2">Attach file (optional)</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={event => setNewAttachment(event.target.files?.[0] || null)}
              className="w-full text-sm text-white/60"
            />
            <div className="text-xs text-white/50 mt-1">Accepted: images or PDF (max 5MB).</div>
          </div>
          <LoadingButton
            onClick={handleCreateTicket}
            isLoading={isCreating}
            loadingText="Sending..."
            className="px-6 py-3 rounded-full font-semibold"
            style={{
              background: 'linear-gradient(135deg, #582dff, #3a137a)',
              color: '#ffffff',
            }}
          >
            Send request
          </LoadingButton>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
        <div
          className="p-4 rounded-3xl h-full"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.02))',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <div className="flex items-center gap-2 text-white/80 text-sm mb-4">
            <MessageCircle size={16} />
            Your requests
          </div>
          {tickets.length === 0 ? (
            <div className="text-sm text-white/60">No requests yet.</div>
          ) : (
            <div className="space-y-2">
              {tickets.map(ticket => {
                const isActive = ticket.id === activeId
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
                    <div className="text-xs text-white/60">{statusLabel(ticket.status)}</div>
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
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-white font-semibold">{activeTicket.subject}</div>
                  <div className="text-xs text-white/50">{statusLabel(activeTicket.status)}</div>
                </div>
                <div className="text-xs text-white/50">
                  Updated {new Date(activeTicket.lastMessageAt || activeTicket.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                {activeTicket.messages.map(msg => {
                  const isUser = msg.senderRole === 'user'
                  return (
                    <div
                      key={msg.id}
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                        isUser ? 'ml-auto' : 'mr-auto'
                      }`}
                      style={{
                        background: isUser
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
                    placeholder="Write a message"
                  />
                  <label className="px-3 py-3 rounded-full text-xs text-white/70 border border-white/10 cursor-pointer">
                    Attach
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={event => setReplyAttachment(event.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
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
