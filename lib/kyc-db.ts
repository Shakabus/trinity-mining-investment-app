import { Prisma } from '@prisma/client'

function extractErrorCode(error: unknown) {
  if (typeof error !== 'object' || !error || !('code' in error)) return ''
  return String((error as { code?: unknown }).code ?? '')
}

function extractErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error ?? '')
}

export function isMissingKycTableError(error: unknown) {
  const code = extractErrorCode(error)
  const message = extractErrorMessage(error)
  return code === 'P2021' || (message.includes('`user_kyc`') && message.includes('does not exist'))
}

export type KycQueryResult<T> = {
  value: T | null
  tableMissing: boolean
}

export async function runKycQuery<T>(query: () => Promise<T>): Promise<KycQueryResult<T>> {
  try {
    return {
      value: await query(),
      tableMissing: false,
    }
  } catch (error) {
    if (isMissingKycTableError(error)) {
      return {
        value: null,
        tableMissing: true,
      }
    }
    throw error
  }
}

export function logKycTableMissing(context: string) {
  console.warn(`[${context}] user_kyc table is missing in the active database`)
}

export function isPrismaKnownRequestError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError
}
