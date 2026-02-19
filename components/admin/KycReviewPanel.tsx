'use client'

import { useMemo, useState } from 'react'
import LoadingButton from '@/components/ui/LoadingButton'
import { useToast } from '@/components/ui/ToastProvider'

type KycRow = {
  id: number
  userId: number
  userName: string
  userEmail: string
  status: string
  firstName: string
  lastName: string
  dateOfBirth: string
  nationality: string
  residenceCountry: string
  addressLine1: string
  addressLine2: string | null
  city: string
  state: string
  postalCode: string
  idType: string
  idNumber: string
  idIssuingCountry: string
  idExpiryDate: string | null
  occupation: string | null
  sourceOfFunds: string | null
  pepDeclaration: boolean
  termsAccepted: boolean
  idDocumentFrontUrl: string
  idDocumentBackUrl: string | null
  selfieUrl: string
  proofOfAddressUrl: string | null
  reviewNote: string | null
  submittedAt: string | null
  reviewedAt: string | null
}

type Props = {
  rows: KycRow[]
}

export default function KycReviewPanel({ rows }: Props) {
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [reviewingId, setReviewingId] = useState<number | null>(null)
  const [decision, setDecision] = useState<'approve' | 'reject'>('approve')
  const [reviewNote, setReviewNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return rows.filter(row => {
      const matchesStatus = statusFilter === 'all' ? true : row.status === statusFilter
      if (!matchesStatus) return false
      if (!normalized) return true
      return (
        row.userName.toLowerCase().includes(normalized) ||
        row.userEmail.toLowerCase().includes(normalized) ||
        `${row.firstName} ${row.lastName}`.toLowerCase().includes(normalized)
      )
    })
  }, [query, rows, statusFilter])

  const submitReview = async () => {
    if (!reviewingId) return
    if (decision === 'reject' && reviewNote.trim().length < 8) {
      showToast('Add a rejection note so the user can correct and resubmit.', 'error')
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/admin/kyc/${reviewingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          note: reviewNote.trim() || '',
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to review KYC record.')
      }

      showToast('KYC record updated.', 'success')
      setReviewingId(null)
      setReviewNote('')
      setTimeout(() => window.location.reload(), 500)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to review KYC record.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search by name or email"
          className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/45"
        />
        <select
          value={statusFilter}
          onChange={event => setStatusFilter(event.target.value as typeof statusFilter)}
          className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
        >
          <option value="pending" className="bg-zinc-900">Pending</option>
          <option value="approved" className="bg-zinc-900">Approved</option>
          <option value="rejected" className="bg-zinc-900">Rejected</option>
          <option value="all" className="bg-zinc-900">All</option>
        </select>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/70">
          {filteredRows.length} KYC record(s)
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-white/65">
          No KYC records match your current filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRows.map(row => (
            <div
              key={row.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-white font-semibold">{row.userName}</div>
                  <div className="text-xs text-white/60">{row.userEmail}</div>
                </div>
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-semibold border"
                  style={{
                    background:
                      row.status === 'approved'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : row.status === 'rejected'
                        ? 'rgba(239, 68, 68, 0.15)'
                        : 'rgba(245, 158, 11, 0.15)',
                    borderColor:
                      row.status === 'approved'
                        ? 'rgba(16, 185, 129, 0.35)'
                        : row.status === 'rejected'
                        ? 'rgba(239, 68, 68, 0.35)'
                        : 'rgba(245, 158, 11, 0.35)',
                    color:
                      row.status === 'approved'
                        ? '#6ee7b7'
                        : row.status === 'rejected'
                        ? '#fecaca'
                        : '#fcd34d',
                  }}
                >
                  {row.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 text-xs text-white/80">
                <Detail label="Legal name" value={`${row.firstName} ${row.lastName}`} />
                <Detail label="Date of birth" value={new Date(row.dateOfBirth).toLocaleDateString()} />
                <Detail label="Nationality" value={row.nationality} />
                <Detail label="Residence country" value={row.residenceCountry} />
                <Detail label="Address" value={`${row.addressLine1}${row.addressLine2 ? `, ${row.addressLine2}` : ''}`} />
                <Detail label="City / State" value={`${row.city}, ${row.state} ${row.postalCode}`} />
                <Detail label="ID type" value={row.idType} />
                <Detail label="ID number" value={row.idNumber} />
                <Detail label="Issuing country" value={row.idIssuingCountry} />
                <Detail label="Occupation" value={row.occupation || 'N/A'} />
                <Detail label="Source of funds" value={row.sourceOfFunds || 'N/A'} />
                <Detail label="PEP declaration" value={row.pepDeclaration ? 'Yes' : 'No'} />
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <DocLink label="ID Front" href={row.idDocumentFrontUrl} />
                {row.idDocumentBackUrl ? <DocLink label="ID Back" href={row.idDocumentBackUrl} /> : null}
                <DocLink label="Selfie" href={row.selfieUrl} />
                {row.proofOfAddressUrl ? <DocLink label="Proof of Address" href={row.proofOfAddressUrl} /> : null}
              </div>

              {row.reviewNote ? (
                <div className="text-xs text-white/65">Review note: {row.reviewNote}</div>
              ) : null}

              {row.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => {
                    setReviewingId(row.id)
                    setDecision('approve')
                    setReviewNote('')
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-white border border-white/20 hover:bg-white/10 transition-colors"
                >
                  Review KYC
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {reviewingId ? (
        <div className="rounded-xl border border-blue-400/30 bg-blue-500/10 p-4 space-y-3">
          <div className="text-sm text-white font-semibold">Review KYC #{reviewingId}</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <select
              value={decision}
              onChange={event => setDecision(event.target.value as 'approve' | 'reject')}
              className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
            >
              <option value="approve" className="bg-zinc-900">Approve</option>
              <option value="reject" className="bg-zinc-900">Reject</option>
            </select>
            <input
              value={reviewNote}
              onChange={event => setReviewNote(event.target.value)}
              placeholder={decision === 'reject' ? 'Required note for rejection' : 'Optional review note'}
              className="md:col-span-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/45"
            />
          </div>
          <div className="flex gap-2">
            <LoadingButton
              onClick={submitReview}
              isLoading={isSubmitting}
              loadingText="Saving..."
              className="px-4 py-2 rounded-lg text-xs font-semibold"
              style={{ background: '#2563eb', color: '#ffffff' }}
            >
              Apply Review
            </LoadingButton>
            <button
              type="button"
              onClick={() => setReviewingId(null)}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white/85 border border-white/20"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-white/55">{label}</div>
      <div className="mt-1 text-white/90">{value}</div>
    </div>
  )
}

function DocLink({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="px-3 py-1.5 rounded-full border border-white/20 text-white/85 hover:bg-white/10 transition-colors"
    >
      {label}
    </a>
  )
}
