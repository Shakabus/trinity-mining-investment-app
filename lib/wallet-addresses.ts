import { prisma } from '@/lib/db'

export const SOL_WALLET_ACTIVITY_ACTION = 'WalletSolAddressUpdated'

type StoredSolWalletAddress = {
  version: 1
  solAddress: string
}

export function parseSolWalletAddressDetail(detail: string | null): StoredSolWalletAddress | null {
  if (!detail) return null

  try {
    const parsed = JSON.parse(detail) as Partial<StoredSolWalletAddress>
    if (parsed.version !== 1 || typeof parsed.solAddress !== 'string') return null

    return {
      version: 1,
      solAddress: parsed.solAddress.trim(),
    }
  } catch {
    return null
  }
}

export function buildSolWalletAddressDetail(solAddress: string) {
  return JSON.stringify({
    version: 1,
    solAddress: solAddress.trim(),
  })
}

export async function getLatestSolWalletAddress(userId: number) {
  const row = await prisma.userActivityLog.findFirst({
    where: {
      userId,
      action: SOL_WALLET_ACTIVITY_ACTION,
    },
    orderBy: { createdAt: 'desc' },
    select: { detail: true },
  })

  return parseSolWalletAddressDetail(row?.detail ?? null)?.solAddress ?? ''
}
