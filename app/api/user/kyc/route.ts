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
import { isMissingKycTableError, logKycTableMissing, runKycQuery } from '@/lib/kyc-db'

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

const KYC_ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'heic', 'heif'] as const

class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function extractFileExtension(fileName: string) {
  const parts = fileName.split('.')
  if (parts.length < 2) return ''
  return parts[parts.length - 1].trim().toLowerCase()
}

function isAllowedKycFileType(file: File) {
  const mime = (file.type || '').trim().toLowerCase()
  const extension = extractFileExtension(file.name)

  if (mime && KYC_ALLOWED_FILE_TYPES.map(type => type.toLowerCase()).includes(mime)) {
    return true
  }

  // Some mobile browsers can omit MIME for HEIC/HEIF uploads; allow by file extension fallback.
  return KYC_ALLOWED_EXTENSIONS.includes(extension as (typeof KYC_ALLOWED_EXTENSIONS)[number])
}

function assertAllowedKycFileType(file: File, field: string) {
  if (!isAllowedKycFileType(file)) {
    throw new HttpError(400, `${field} has an unsupported file type.`)
  }
}

function parseBooleanFlag(raw: string | undefined) {
  if (!raw) return false
  return raw.toLowerCase() === 'true' || raw === '1' || raw.toLowerCase() === 'on'
}

function parseDateValue(raw: string | undefined, field: string, required = false) {
  if (!raw) {
    if (required) {
      throw new HttpError(400, `${field} is required.`)
    }
    return null
  }
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, `${field} is invalid.`)
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
      logKycTableMissing('api/user/kyc:GET')
      return NextResponse.json(
        { error: 'KYC service is unavailable. Please retry after database sync.' },
        { status: 503 }
      )
    }
    const kyc = kycQuery.value

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
    if (isMissingKycTableError(error)) {
      logKycTableMissing('api/user/kyc:GET')
      return NextResponse.json(
        { error: 'KYC service is unavailable. Please retry after database sync.' },
        { status: 503 }
      )
    }
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

    const existingQuery = await runKycQuery(() =>
      prisma.userKyc.findUnique({
        where: { userId: user.id },
        select: {
          id: true,
          idDocumentFrontUrl: true,
          idDocumentBackUrl: true,
          selfieUrl: true,
          proofOfAddressUrl: true,
        },
      })
    )
    if (existingQuery.tableMissing) {
      logKycTableMissing('api/user/kyc:POST')
      return NextResponse.json(
        { error: 'KYC service is unavailable. Please retry after database sync.' },
        { status: 503 }
      )
    }
    const existing = existingQuery.value

    const idDocumentFront = readFormFile(formData, 'idDocumentFront', {
      required: !existing?.idDocumentFrontUrl,
      maxBytes: KYC_MAX_FILE_SIZE,
    })
    const idDocumentBack = readFormFile(formData, 'idDocumentBack', {
      maxBytes: KYC_MAX_FILE_SIZE,
    })
    const selfieDocument = readFormFile(formData, 'selfieDocument', {
      required: !existing?.selfieUrl,
      maxBytes: KYC_MAX_FILE_SIZE,
    })
    const proofOfAddressDocument = readFormFile(formData, 'proofOfAddressDocument', {
      maxBytes: KYC_MAX_FILE_SIZE,
    })

    if (idDocumentFront) assertAllowedKycFileType(idDocumentFront, 'idDocumentFront')
    if (idDocumentBack) assertAllowedKycFileType(idDocumentBack, 'idDocumentBack')
    if (selfieDocument) assertAllowedKycFileType(selfieDocument, 'selfieDocument')
    if (proofOfAddressDocument) assertAllowedKycFileType(proofOfAddressDocument, 'proofOfAddressDocument')

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

    const submittedAt = new Date()
    const payload = {
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
      submittedAt,
      reviewedAt: null,
      reviewedByAdminId: null,
      reviewNote: null,
    }
    const upsertResult = await runKycQuery(() =>
      prisma.userKyc.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          ...payload,
        },
        update: payload,
      })
    )
    if (upsertResult.tableMissing) {
      logKycTableMissing('api/user/kyc:POST')
      return NextResponse.json(
        { error: 'KYC service is unavailable. Please retry after database sync.' },
        { status: 503 }
      )
    }

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
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (isMissingKycTableError(error)) {
      logKycTableMissing('api/user/kyc:POST')
      return NextResponse.json(
        { error: 'KYC service is unavailable. Please retry after database sync.' },
        { status: 503 }
      )
    }
    console.error('Submit KYC error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
