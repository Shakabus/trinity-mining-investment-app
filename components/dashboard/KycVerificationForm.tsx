'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import LoadingButton from '@/components/ui/LoadingButton'

type KycFormData = {
  status: string
  firstName: string
  lastName: string
  dateOfBirth: string
  nationality: string
  residenceCountry: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  postalCode: string
  idType: string
  idNumber: string
  idIssuingCountry: string
  idExpiryDate: string
  occupation: string
  sourceOfFunds: string
  pepDeclaration: boolean
  termsAccepted: boolean
  idDocumentFrontUrl: string | null
  idDocumentBackUrl: string | null
  selfieUrl: string | null
  proofOfAddressUrl: string | null
  reviewNote: string | null
  submittedAt: string | null
  reviewedAt: string | null
}

type Props = {
  initialData: KycFormData
}

export default function KycVerificationForm({ initialData }: Props) {
  const [form, setForm] = useState<KycFormData>(initialData)
  const [idDocumentFront, setIdDocumentFront] = useState<File | null>(null)
  const [idDocumentBack, setIdDocumentBack] = useState<File | null>(null)
  const [selfieDocument, setSelfieDocument] = useState<File | null>(null)
  const [proofOfAddressDocument, setProofOfAddressDocument] = useState<File | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ type: 'idle' | 'error' | 'success'; message: string }>({
    type: 'idle',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const statusBadge = useMemo(() => {
    if (form.status === 'approved') {
      return { label: 'Approved', className: 'text-emerald-200 border-emerald-400/35 bg-emerald-500/15' }
    }
    if (form.status === 'pending') {
      return { label: 'Pending Review', className: 'text-amber-200 border-amber-400/35 bg-amber-500/15' }
    }
    if (form.status === 'rejected') {
      return { label: 'Rejected', className: 'text-rose-200 border-rose-400/35 bg-rose-500/15' }
    }
    return { label: 'Not Submitted', className: 'text-white/80 border-white/20 bg-white/5' }
  }, [form.status])

  const updateField = <K extends keyof KycFormData>(key: K, value: KycFormData[K]) => {
    setForm(current => ({ ...current, [key]: value }))
  }

  const submit = async () => {
    if (!form.termsAccepted) {
      setStatusMessage({ type: 'error', message: 'You must accept the verification terms before submitting.' })
      return
    }

    try {
      setIsSubmitting(true)
      setStatusMessage({ type: 'idle', message: '' })

      const payload = new FormData()
      payload.append('firstName', form.firstName)
      payload.append('lastName', form.lastName)
      payload.append('dateOfBirth', form.dateOfBirth)
      payload.append('nationality', form.nationality)
      payload.append('residenceCountry', form.residenceCountry)
      payload.append('addressLine1', form.addressLine1)
      payload.append('addressLine2', form.addressLine2 || '')
      payload.append('city', form.city)
      payload.append('state', form.state)
      payload.append('postalCode', form.postalCode)
      payload.append('idType', form.idType)
      payload.append('idNumber', form.idNumber)
      payload.append('idIssuingCountry', form.idIssuingCountry)
      payload.append('idExpiryDate', form.idExpiryDate || '')
      payload.append('occupation', form.occupation || '')
      payload.append('sourceOfFunds', form.sourceOfFunds || '')
      payload.append('pepDeclaration', String(form.pepDeclaration))
      payload.append('termsAccepted', String(form.termsAccepted))
      if (idDocumentFront) payload.append('idDocumentFront', idDocumentFront)
      if (idDocumentBack) payload.append('idDocumentBack', idDocumentBack)
      if (selfieDocument) payload.append('selfieDocument', selfieDocument)
      if (proofOfAddressDocument) payload.append('proofOfAddressDocument', proofOfAddressDocument)

      const response = await fetch('/api/user/kyc', {
        method: 'POST',
        body: payload,
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || 'Unable to submit KYC.')
      }

      setForm(current => ({ ...current, status: 'pending', reviewNote: null }))
      setStatusMessage({ type: 'success', message: 'KYC submitted successfully and is pending review.' })
      setIdDocumentFront(null)
      setIdDocumentBack(null)
      setSelfieDocument(null)
      setProofOfAddressDocument(null)
      setTimeout(() => window.location.reload(), 800)
    } catch (error) {
      setStatusMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to submit KYC.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 lg:px-6 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white">KYC Verification</h1>
          <p className="text-white/70 mt-2">
            Complete identity verification to unlock account withdrawals. Your data is used strictly for compliance verification.
          </p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${statusBadge.className}`}>
          {statusBadge.label}
        </span>
      </div>

      {form.reviewNote && (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          Review note: {form.reviewNote}
        </div>
      )}

      <div
        className="p-6 rounded-3xl space-y-5"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))',
          border: '1px solid rgba(255,255,255,0.18)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <h2 className="text-xl font-semibold text-white">Personal Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="First name" value={form.firstName} onChange={value => updateField('firstName', value)} />
          <Field label="Last name" value={form.lastName} onChange={value => updateField('lastName', value)} />
          <Field label="Date of birth" type="date" value={form.dateOfBirth} onChange={value => updateField('dateOfBirth', value)} />
          <Field label="Nationality" value={form.nationality} onChange={value => updateField('nationality', value)} />
          <Field label="Residence country" value={form.residenceCountry} onChange={value => updateField('residenceCountry', value)} />
          <Field label="Occupation" value={form.occupation} onChange={value => updateField('occupation', value)} />
        </div>

        <h2 className="text-xl font-semibold text-white pt-2">Address Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Address line 1" value={form.addressLine1} onChange={value => updateField('addressLine1', value)} />
          <Field label="Address line 2 (optional)" value={form.addressLine2} onChange={value => updateField('addressLine2', value)} />
          <Field label="City" value={form.city} onChange={value => updateField('city', value)} />
          <Field label="State / Region" value={form.state} onChange={value => updateField('state', value)} />
          <Field label="Postal code" value={form.postalCode} onChange={value => updateField('postalCode', value)} />
          <Field label="Source of funds" value={form.sourceOfFunds} onChange={value => updateField('sourceOfFunds', value)} />
        </div>

        <h2 className="text-xl font-semibold text-white pt-2">Identity Document</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-white/80 mb-2">ID Type</label>
            <select
              value={form.idType}
              onChange={event => updateField('idType', event.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
            >
              <option value="passport" className="bg-zinc-900">Passport</option>
              <option value="drivers_license" className="bg-zinc-900">Driver License</option>
              <option value="national_id" className="bg-zinc-900">National ID</option>
              <option value="state_id" className="bg-zinc-900">State ID</option>
            </select>
          </div>
          <Field label="ID number" value={form.idNumber} onChange={value => updateField('idNumber', value)} />
          <Field label="Issuing country" value={form.idIssuingCountry} onChange={value => updateField('idIssuingCountry', value)} />
          <Field label="Expiry date (optional)" type="date" value={form.idExpiryDate} onChange={value => updateField('idExpiryDate', value)} />
        </div>

        <h2 className="text-xl font-semibold text-white pt-2">Document Uploads</h2>
        <p className="text-xs text-white/60">
          Accepted formats: JPG, PNG, WEBP, PDF. Maximum file size per file: 6MB.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FileField label="ID Front (required)" onChange={setIdDocumentFront} existingUrl={form.idDocumentFrontUrl} />
          <FileField label="ID Back (optional)" onChange={setIdDocumentBack} existingUrl={form.idDocumentBackUrl} />
          <FileField label="Selfie with ID (required)" onChange={setSelfieDocument} existingUrl={form.selfieUrl} />
          <FileField label="Proof of Address (optional)" onChange={setProofOfAddressDocument} existingUrl={form.proofOfAddressUrl} />
        </div>

        <div className="space-y-2 pt-1">
          <label className="flex items-center gap-2 text-sm text-white/85">
            <input
              type="checkbox"
              checked={form.pepDeclaration}
              onChange={event => updateField('pepDeclaration', event.target.checked)}
              className="h-4 w-4 rounded border-white/30 bg-white/10"
            />
            I confirm whether I am a politically exposed person (PEP).
          </label>
          <label className="flex items-center gap-2 text-sm text-white/85">
            <input
              type="checkbox"
              checked={form.termsAccepted}
              onChange={event => updateField('termsAccepted', event.target.checked)}
              className="h-4 w-4 rounded border-white/30 bg-white/10"
            />
            I consent to KYC data processing for identity and compliance verification only.
          </label>
        </div>

        {statusMessage.type !== 'idle' && (
          <div className={`text-sm ${statusMessage.type === 'error' ? 'text-rose-300' : 'text-emerald-300'}`}>
            {statusMessage.message}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <LoadingButton
            onClick={submit}
            isLoading={isSubmitting}
            loadingText="Submitting..."
            className="px-6 py-3 rounded-full font-semibold"
            style={{
              background: 'linear-gradient(135deg, #582dff, #3a137a)',
              color: '#ffffff',
            }}
          >
            Submit KYC
          </LoadingButton>
          <Link href="/dashboard/account/withdraw" className="text-sm text-white/80 underline underline-offset-4">
            Back to Withdraw Funds
          </Link>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'date'
}) {
  return (
    <div>
      <label className="block text-sm text-white/80 mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
      />
    </div>
  )
}

function FileField({
  label,
  existingUrl,
  onChange,
}: {
  label: string
  existingUrl: string | null
  onChange: (file: File | null) => void
}) {
  return (
    <div>
      <label className="block text-sm text-white/80 mb-2">{label}</label>
      <input
        type="file"
        accept="image/*,application/pdf"
        onChange={event => onChange(event.target.files?.[0] || null)}
        className="w-full text-sm text-white/70"
      />
      {existingUrl ? (
        <a
          href={existingUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-block mt-2 text-xs text-blue-200 underline underline-offset-4"
        >
          View previously uploaded document
        </a>
      ) : null}
    </div>
  )
}
