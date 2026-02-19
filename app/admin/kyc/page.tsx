import { prisma } from '@/lib/db'
import KycReviewPanel from '@/components/admin/KycReviewPanel'

export const dynamic = 'force-dynamic'

export default async function AdminKycPage() {
  const records = await prisma.userKyc.findMany({
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
    orderBy: [{ status: 'asc' }, { submittedAt: 'desc' }, { updatedAt: 'desc' }],
    take: 1500,
  })

  const rows = records.map(record => ({
    id: record.id,
    userId: record.userId,
    userName: record.user.fullName || record.user.email || `User #${record.user.id}`,
    userEmail: record.user.email || '',
    status: record.status,
    firstName: record.firstName,
    lastName: record.lastName,
    dateOfBirth: record.dateOfBirth.toISOString(),
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
    idExpiryDate: record.idExpiryDate?.toISOString() ?? null,
    occupation: record.occupation,
    sourceOfFunds: record.sourceOfFunds,
    pepDeclaration: record.pepDeclaration,
    termsAccepted: record.termsAccepted,
    idDocumentFrontUrl: record.idDocumentFrontUrl,
    idDocumentBackUrl: record.idDocumentBackUrl,
    selfieUrl: record.selfieUrl,
    proofOfAddressUrl: record.proofOfAddressUrl,
    reviewNote: record.reviewNote,
    submittedAt: record.submittedAt?.toISOString() ?? null,
    reviewedAt: record.reviewedAt?.toISOString() ?? null,
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
        <KycReviewPanel rows={rows} />
      </div>
    </div>
  )
}
