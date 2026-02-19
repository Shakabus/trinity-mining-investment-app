import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import KycVerificationForm from '@/components/dashboard/KycVerificationForm'

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
      kycProfile: {
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
      },
    },
  })

  if (!user) {
    redirect('/sign-in')
  }

  const [firstName = '', ...rest] = (user.fullName || '').trim().split(' ')
  const lastName = rest.join(' ')

  const initialData = user.kycProfile
    ? {
        status: user.kycProfile.status,
        firstName: user.kycProfile.firstName,
        lastName: user.kycProfile.lastName,
        dateOfBirth: user.kycProfile.dateOfBirth.toISOString().slice(0, 10),
        nationality: user.kycProfile.nationality,
        residenceCountry: user.kycProfile.residenceCountry,
        addressLine1: user.kycProfile.addressLine1,
        addressLine2: user.kycProfile.addressLine2 || '',
        city: user.kycProfile.city,
        state: user.kycProfile.state,
        postalCode: user.kycProfile.postalCode,
        idType: user.kycProfile.idType,
        idNumber: user.kycProfile.idNumber,
        idIssuingCountry: user.kycProfile.idIssuingCountry,
        idExpiryDate: user.kycProfile.idExpiryDate
          ? user.kycProfile.idExpiryDate.toISOString().slice(0, 10)
          : '',
        occupation: user.kycProfile.occupation || '',
        sourceOfFunds: user.kycProfile.sourceOfFunds || '',
        pepDeclaration: user.kycProfile.pepDeclaration,
        termsAccepted: user.kycProfile.termsAccepted,
        idDocumentFrontUrl: user.kycProfile.idDocumentFrontUrl,
        idDocumentBackUrl: user.kycProfile.idDocumentBackUrl,
        selfieUrl: user.kycProfile.selfieUrl,
        proofOfAddressUrl: user.kycProfile.proofOfAddressUrl,
        reviewNote: user.kycProfile.reviewNote,
        submittedAt: user.kycProfile.submittedAt?.toISOString() ?? null,
        reviewedAt: user.kycProfile.reviewedAt?.toISOString() ?? null,
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
