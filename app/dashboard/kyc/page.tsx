import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import KycVerificationForm from '@/components/dashboard/KycVerificationForm'
import { logKycTableMissing, runKycQuery } from '@/lib/kyc-db'

export const dynamic = 'force-dynamic'

export default async function DashboardKycPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      id: true,
      fullName: true,
    },
  })

  if (!user) {
    redirect('/sign-in')
  }

  const kycQuery = await runKycQuery(() =>
    prisma.userKyc.findUnique({
      where: { userId: user.id },
      select: {
        status: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        nationality: true,
        residenceCountry: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        idType: true,
        idNumber: true,
        idIssuingCountry: true,
        idExpiryDate: true,
        occupation: true,
        sourceOfFunds: true,
        pepDeclaration: true,
        termsAccepted: true,
        idDocumentFrontUrl: true,
        idDocumentBackUrl: true,
        selfieUrl: true,
        proofOfAddressUrl: true,
        reviewNote: true,
        submittedAt: true,
        reviewedAt: true,
      },
    })
  )

  if (kycQuery.tableMissing) {
    logKycTableMissing('dashboard/kyc')
    return (
      <div className="max-w-5xl mx-auto px-2 sm:px-4 lg:px-6 py-6">
        <div
          className="p-6 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.04))',
            border: '1px solid rgba(245, 158, 11, 0.35)',
          }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-white">KYC temporarily unavailable</h1>
          <p className="text-white/80 mt-2">
            The verification service is not ready in the active database yet. Please try again after migration completes.
          </p>
        </div>
      </div>
    )
  }

  const kycProfile = kycQuery.value
  const [firstName = '', ...rest] = (user.fullName || '').trim().split(' ')
  const lastName = rest.join(' ')

  const initialData = kycProfile
    ? {
        status: kycProfile.status,
        firstName: kycProfile.firstName,
        lastName: kycProfile.lastName,
        dateOfBirth: kycProfile.dateOfBirth.toISOString().slice(0, 10),
        nationality: kycProfile.nationality,
        residenceCountry: kycProfile.residenceCountry,
        addressLine1: kycProfile.addressLine1,
        addressLine2: kycProfile.addressLine2 || '',
        city: kycProfile.city,
        state: kycProfile.state,
        postalCode: kycProfile.postalCode,
        idType: kycProfile.idType,
        idNumber: kycProfile.idNumber,
        idIssuingCountry: kycProfile.idIssuingCountry,
        idExpiryDate: kycProfile.idExpiryDate ? kycProfile.idExpiryDate.toISOString().slice(0, 10) : '',
        occupation: kycProfile.occupation || '',
        sourceOfFunds: kycProfile.sourceOfFunds || '',
        pepDeclaration: kycProfile.pepDeclaration,
        termsAccepted: kycProfile.termsAccepted,
        idDocumentFrontUrl: kycProfile.idDocumentFrontUrl,
        idDocumentBackUrl: kycProfile.idDocumentBackUrl,
        selfieUrl: kycProfile.selfieUrl,
        proofOfAddressUrl: kycProfile.proofOfAddressUrl,
        reviewNote: kycProfile.reviewNote,
        submittedAt: kycProfile.submittedAt?.toISOString() ?? null,
        reviewedAt: kycProfile.reviewedAt?.toISOString() ?? null,
      }
    : {
        status: 'not_submitted',
        firstName,
        lastName,
        dateOfBirth: '',
        nationality: '',
        residenceCountry: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        idType: 'passport',
        idNumber: '',
        idIssuingCountry: '',
        idExpiryDate: '',
        occupation: '',
        sourceOfFunds: '',
        pepDeclaration: false,
        termsAccepted: false,
        idDocumentFrontUrl: null,
        idDocumentBackUrl: null,
        selfieUrl: null,
        proofOfAddressUrl: null,
        reviewNote: null,
        submittedAt: null,
        reviewedAt: null,
      }

  return <KycVerificationForm initialData={initialData} />
}
