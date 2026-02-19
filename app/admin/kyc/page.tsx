import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import KycReviewPanel from '@/components/admin/KycReviewPanel'
import { isMissingKycTableError, logKycTableMissing } from '@/lib/kyc-db'

export const dynamic = 'force-dynamic'

export default async function AdminKycPage() {
  type RawKycRow = {
    id: number
    userId: number
    status: string
    firstName: string
    lastName: string
    dateOfBirth: Date | string
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
    idExpiryDate: Date | string | null
    occupation: string | null
    sourceOfFunds: string | null
    pepDeclaration: number | boolean
    termsAccepted: number | boolean
    idDocumentFrontUrl: string
    idDocumentBackUrl: string | null
    selfieUrl: string
    proofOfAddressUrl: string | null
    reviewNote: string | null
    submittedAt: Date | string | null
    reviewedAt: Date | string | null
    userName: string | null
    userEmail: string | null
  }

  const { records, kycTableMissing } = await prisma
    .$queryRaw<RawKycRow[]>(
      Prisma.sql`
      SELECT
        uk.id,
        uk.user_id AS userId,
        uk.status,
        uk.first_name AS firstName,
        uk.last_name AS lastName,
        uk.date_of_birth AS dateOfBirth,
        uk.nationality,
        uk.residence_country AS residenceCountry,
        uk.address_line_1 AS addressLine1,
        uk.address_line_2 AS addressLine2,
        uk.city,
        uk.state,
        uk.postal_code AS postalCode,
        uk.id_type AS idType,
        uk.id_number AS idNumber,
        uk.id_issuing_country AS idIssuingCountry,
        uk.id_expiry_date AS idExpiryDate,
        uk.occupation,
        uk.source_of_funds AS sourceOfFunds,
        uk.pep_declaration AS pepDeclaration,
        uk.terms_accepted AS termsAccepted,
        uk.id_document_front_url AS idDocumentFrontUrl,
        uk.id_document_back_url AS idDocumentBackUrl,
        uk.selfie_url AS selfieUrl,
        uk.proof_of_address_url AS proofOfAddressUrl,
        uk.review_note AS reviewNote,
        uk.submitted_at AS submittedAt,
        uk.reviewed_at AS reviewedAt,
        u.full_name AS userName,
        u.email AS userEmail
      FROM user_kyc uk
      LEFT JOIN users u ON u.id = uk.user_id
      ORDER BY
        CASE uk.status
          WHEN 'pending' THEN 0
          WHEN 'rejected' THEN 1
          WHEN 'approved' THEN 2
          ELSE 3
        END,
        uk.submitted_at DESC,
        uk.updated_at DESC
      LIMIT 1500
    `
    )
    .then(records => ({ records, kycTableMissing: false }))
    .catch(error => {
      if (isMissingKycTableError(error)) {
        logKycTableMissing('admin/kyc')
        return { records: [] as RawKycRow[], kycTableMissing: true }
      }
      throw error
    })

  const toIso = (value: Date | string | null) => {
    if (!value) return null
    const date = value instanceof Date ? value : new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }

  const rows = records.map(record => ({
    id: record.id,
    userId: record.userId,
    userName: record.userName || record.userEmail || `User #${record.userId}`,
    userEmail: record.userEmail || '',
    status: record.status,
    firstName: record.firstName,
    lastName: record.lastName,
    dateOfBirth: toIso(record.dateOfBirth) || new Date(0).toISOString(),
    nationality: record.nationality,
    residenceCountry: record.residenceCountry,
    addressLine1: record.addressLine1,
    addressLine2: record.addressLine2,
    city: record.city,
    state: record.state,
    postalCode: record.postalCode,
    idType: record.idType,
    idNumber: record.idNumber,
    idIssuingCountry: record.idIssuingCountry,
    idExpiryDate: toIso(record.idExpiryDate),
    occupation: record.occupation,
    sourceOfFunds: record.sourceOfFunds,
    pepDeclaration: Boolean(record.pepDeclaration),
    termsAccepted: Boolean(record.termsAccepted),
    idDocumentFrontUrl: record.idDocumentFrontUrl,
    idDocumentBackUrl: record.idDocumentBackUrl,
    selfieUrl: record.selfieUrl,
    proofOfAddressUrl: record.proofOfAddressUrl,
    reviewNote: record.reviewNote,
    submittedAt: toIso(record.submittedAt),
    reviewedAt: toIso(record.reviewedAt),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">KYC Verification</h1>
        <p className="text-white/70">
          Review identity submissions, approve eligible users, and reject incomplete profiles with notes.
        </p>
      </div>

      <div
        className="p-5 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          border: '1px solid rgba(255, 255, 255, 0.16)',
        }}
      >
        {kycTableMissing && (
          <div className="mb-4 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            No KYC records available yet. If this is unexpected, run the KYC migration on the production database.
          </div>
        )}
        <KycReviewPanel rows={rows} />
      </div>
    </div>
  )
}
