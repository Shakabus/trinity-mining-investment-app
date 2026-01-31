import { prisma } from '@/lib/db'

const REFERRAL_CODE_LENGTH = 8

function randomCode(length: number) {
  let output = ''
  while (output.length < length) {
    output += Math.random().toString(36).slice(2).toUpperCase()
  }
  return output.slice(0, length)
}

export async function createUniqueReferralCode() {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = randomCode(REFERRAL_CODE_LENGTH)
    const existing = await prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    })
    if (!existing) {
      return code
    }
  }

  const fallback = `${Date.now().toString(36).toUpperCase()}${randomCode(3)}`
  return fallback.slice(0, REFERRAL_CODE_LENGTH)
}

export function normalizeReferralCode(value: string | null | undefined) {
  if (!value) return null
  const trimmed = value.trim().toUpperCase()
  return trimmed.length > 0 ? trimmed : null
}
