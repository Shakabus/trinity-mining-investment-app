import { randomUUID } from 'crypto'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { prisma } from '@/lib/db'
import { logUserActivity } from '@/lib/user-activity'
import {
  KYC_ALLOWED_FILE_TYPES,
  KYC_ID_TYPES,
  KYC_MAX_FILE_SIZE,
  KYC_STATUSES,
} from '@/lib/kyc'
import {
  isInputValidationError,
  readFormDataStrict,
  readFormFile,
  readFormString,
} from '@/lib/requestValidation'

export const runtime = 'nodejs'

const KYC_ALLOWED_FIELDS = [
  'firstName',
  'lastName',
  'dateOfBirth',
  'nationality',
  'residenceCountry',
  'addressLine1',
  'addressLine2',
  'city',
  'state',
  'postalCode',
  'idType',
  'idNumber',
  'idIssuingCountry',
  'idExpiryDate',
  'occupation',
  'sourceOfFunds',
  'pepDeclaration',
  'termsAccepted',
  'idDocumentFront',
  'idDocumentBack',
  'selfieDocument',
  'proofOfAddressDocument',
] as const

function parseBooleanFlag(raw: string | undefined) {
  if (!raw) return false
  return raw.toLowerCase() === 'true' || raw === '1' || raw.toLowerCase() === 'on'
}

function parseDateValue(raw: string | undefined, field: string, required = false) {
  if (!raw) {
    if (required) {
      throw new Error(`${field} is required.`)
    }
    return null
  }
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${field} is invalid.`)
  }
  return parsed
}

async function uploadKycFile(userId: number, file: File, label: string) {
  const extension = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1] || 'bin'
  const filename = `kyc_${label}_${userId}_${randomUUID()}.${extension}`
  const blob = await put(`kyc-documents/${filename}`, Buffer.from(await file.arrayBuffer()), {
    access: 'public',
    contentType: file.type,
  })
  return blob.url
}

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const kyc = await prisma.userKyc.findUnique({
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

    return NextResponse.json({
      kyc: kyc
        ? {
            ...kyc,
            dateOfBirth: kyc.dateOfBirth.toISOString().slice(0, 10),
            idExpiryDate: kyc.idExpiryDate ? kyc.idExpiryDate.toISOString().slice(0, 10) : null,
            submittedAt: kyc.submittedAt?.toISOString() ?? null,
            reviewedAt: kyc.reviewedAt?.toISOString() ?? null,
          }
        : { status: 'not_submitted' },
    })
  } catch (error) {
    console.error('Fetch user KYC error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await readFormDataStrict(req, { allowedKeys: KYC_ALLOWED_FIELDS })

    const firstName = readFormString(formData, 'firstName', { required: true, minLength: 2, maxLength: 80 })!
    const lastName = readFormString(formData, 'lastName', { required: true, minLength: 2, maxLength: 80 })!
    const dateOfBirthRaw = readFormString(formData, 'dateOfBirth', { required: true, maxLength: 20 })!
    const nationality = readFormString(formData, 'nationality', { required: true, minLength: 2, maxLength: 80 })!
    const residenceCountry = readFormString(formData, 'residenceCountry', { required: true, minLength: 2, maxLength: 80 })!
    const addressLine1 = readFormString(formData, 'addressLine1', { required: true, minLength: 5, maxLength: 120 })!
    const addressLine2 = readFormString(formData, 'addressLine2', { maxLength: 120 })
    const city = readFormString(formData, 'city', { required: true, minLength: 2, maxLength: 80 })!
    const state = readFormString(formData, 'state', { required: true, minLength: 2, maxLength: 80 })!
    const postalCode = readFormString(formData, 'postalCode', { required: true, minLength: 2, maxLength: 24 })!
    const idType = readFormString(formData, 'idType', { required: true, enumValues: KYC_ID_TYPES })!
    const idNumber = readFormString(formData, 'idNumber', { required: true, minLength: 4, maxLength: 60 })!
    const idIssuingCountry = readFormString(formData, 'idIssuingCountry', { required: true, minLength: 2, maxLength: 80 })!
    const idExpiryDateRaw = readFormString(formData, 'idExpiryDate', { maxLength: 20 })
    const occupation = readFormString(formData, 'occupation', { maxLength: 120 })
    const sourceOfFunds = readFormString(formData, 'sourceOfFunds', { maxLength: 180 })
    const pepDeclarationRaw = readFormString(formData, 'pepDeclaration', { maxLength: 10 })
    const termsAcceptedRaw = readFormString(formData, 'termsAccepted', { maxLength: 10 })

    const pepDeclaration = parseBooleanFlag(pepDeclarationRaw)
    const termsAccepted = parseBooleanFlag(termsAcceptedRaw)
    if (!termsAccepted) {
      return NextResponse.json({ error: 'You must accept the verification terms.' }, { status: 400 })
    }

    const dateOfBirth = parseDateValue(dateOfBirthRaw, 'dateOfBirth', true)!
    const idExpiryDate = parseDateValue(idExpiryDateRaw || undefined, 'idExpiryDate', false)

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const existing = await prisma.userKyc.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        idDocumentFrontUrl: true,
        idDocumentBackUrl: true,
        selfieUrl: true,
        proofOfAddressUrl: true,
      },
    })

    const idDocumentFront = readFormFile(formData, 'idDocumentFront', {
      required: !existing?.idDocumentFrontUrl,
      maxBytes: KYC_MAX_FILE_SIZE,
      allowedTypes: [...KYC_ALLOWED_FILE_TYPES],
    })
    const idDocumentBack = readFormFile(formData, 'idDocumentBack', {
      maxBytes: KYC_MAX_FILE_SIZE,
      allowedTypes: [...KYC_ALLOWED_FILE_TYPES],
    })
    const selfieDocument = readFormFile(formData, 'selfieDocument', {
      required: !existing?.selfieUrl,
      maxBytes: KYC_MAX_FILE_SIZE,
      allowedTypes: [...KYC_ALLOWED_FILE_TYPES],
    })
    const proofOfAddressDocument = readFormFile(formData, 'proofOfAddressDocument', {
      maxBytes: KYC_MAX_FILE_SIZE,
      allowedTypes: [...KYC_ALLOWED_FILE_TYPES],
    })

    const idDocumentFrontUrl =
      idDocumentFront ? await uploadKycFile(user.id, idDocumentFront, 'id_front') : existing?.idDocumentFrontUrl
    const idDocumentBackUrl =
      idDocumentBack ? await uploadKycFile(user.id, idDocumentBack, 'id_back') : existing?.idDocumentBackUrl
    const selfieUrl =
      selfieDocument ? await uploadKycFile(user.id, selfieDocument, 'selfie') : existing?.selfieUrl
    const proofOfAddressUrl =
      proofOfAddressDocument
        ? await uploadKycFile(user.id, proofOfAddressDocument, 'proof_of_address')
        : existing?.proofOfAddressUrl

    if (!idDocumentFrontUrl || !selfieUrl) {
      return NextResponse.json(
        { error: 'ID front document and selfie document are required.' },
        { status: 400 }
      )
    }

    const status = 'pending'
    if (!KYC_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid KYC state.' }, { status: 500 })
    }

    await prisma.userKyc.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        status,
        firstName,
        lastName,
        dateOfBirth,
        nationality,
        residenceCountry,
        addressLine1,
        addressLine2: addressLine2 || null,
        city,
        state,
        postalCode,
        idType,
        idNumber,
        idIssuingCountry,
        idExpiryDate: idExpiryDate ?? null,
        occupation: occupation || null,
        sourceOfFunds: sourceOfFunds || null,
        pepDeclaration,
        termsAccepted,
        idDocumentFrontUrl,
        idDocumentBackUrl: idDocumentBackUrl || null,
        selfieUrl,
        proofOfAddressUrl: proofOfAddressUrl || null,
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedByAdminId: null,
        reviewNote: null,
      },
      update: {
        status,
        firstName,
        lastName,
        dateOfBirth,
        nationality,
        residenceCountry,
        addressLine1,
        addressLine2: addressLine2 || null,
        city,
        state,
        postalCode,
        idType,
        idNumber,
        idIssuingCountry,
        idExpiryDate: idExpiryDate ?? null,
        occupation: occupation || null,
        sourceOfFunds: sourceOfFunds || null,
        pepDeclaration,
        termsAccepted,
        idDocumentFrontUrl,
        idDocumentBackUrl: idDocumentBackUrl || null,
        selfieUrl,
        proofOfAddressUrl: proofOfAddressUrl || null,
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedByAdminId: null,
        reviewNote: null,
      },
    })

    await logUserActivity({
      userId: user.id,
      action: 'KYCSubmitted',
      detail: 'KYC profile submitted and pending verification.',
    })

    return NextResponse.json({
      success: true,
      message: 'KYC submitted successfully and is pending review.',
    })
  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Submit KYC error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
