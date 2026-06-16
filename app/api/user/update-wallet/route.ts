import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { logUserActivity } from '@/lib/user-activity'
import {
  buildSolWalletAddressDetail,
  getLatestSolWalletAddress,
  SOL_WALLET_ACTIVITY_ACTION,
} from '@/lib/wallet-addresses'
import {
  isInputValidationError,
  readJsonObject,
  readStringField,
} from '@/lib/requestValidation'

const UPDATE_WALLET_ALLOWED_FIELDS = [
  'btcAddress',
  'ethAddress',
  'ltcAddress',
  'usdtAddress',
  'solAddress',
] as const

function validateAddress(label: string, value: string) {
  if (!value) return null
  if (value.length < 10) return `${label} address looks too short.`
  if (value.length > 120) return `${label} address is too long.`

  const btcRegex = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/i
  const ethRegex = /^0x[a-fA-F0-9]{40}$/
  const ltcRegex = /^(ltc1|[LM3])[a-zA-HJ-NP-Z0-9]{25,62}$/i
  const usdtRegex = /^0x[a-fA-F0-9]{40}$|^T[1-9A-HJ-NP-Za-km-z]{33}$/
  const solRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

  if (label === 'BTC' && !btcRegex.test(value)) return 'BTC address format looks invalid.'
  if (label === 'ETH' && !ethRegex.test(value)) return 'ETH address format looks invalid.'
  if (label === 'LTC' && !ltcRegex.test(value)) return 'LTC address format looks invalid.'
  if (label === 'USDT' && !usdtRegex.test(value)) return 'USDT address format looks invalid.'
  if (label === 'SOL' && !solRegex.test(value)) return 'SOL address format looks invalid.'

  return null
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await readJsonObject(req, { allowedKeys: UPDATE_WALLET_ALLOWED_FIELDS })
    const btcAddress = readStringField(body, 'btcAddress', { maxLength: 120 }) || ''
    const ethAddress = readStringField(body, 'ethAddress', { maxLength: 120 }) || ''
    const ltcAddress = readStringField(body, 'ltcAddress', { maxLength: 120 }) || ''
    const usdtAddress = readStringField(body, 'usdtAddress', { maxLength: 120 }) || ''
    const solAddress = readStringField(body, 'solAddress', { maxLength: 120 }) || ''

    const btcError = validateAddress('BTC', btcAddress)
    const ethError = validateAddress('ETH', ethAddress)
    const ltcError = validateAddress('LTC', ltcAddress)
    const usdtError = validateAddress('USDT', usdtAddress)
    const solError = validateAddress('SOL', solAddress)

    if (btcError || ethError || ltcError || usdtError || solError) {
      return NextResponse.json({ error: btcError || ethError || ltcError || usdtError || solError }, { status: 400 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    })
    const currentSolAddress = currentUser ? await getLatestSolWalletAddress(currentUser.id) : ''

    await prisma.user.update({
      where: { clerkUserId: userId },
      data: {
        btcWalletAddress: btcAddress || null,
        ethWalletAddress: ethAddress || null,
        ltcWalletAddress: ltcAddress || null,
        walletAddress: usdtAddress || null,
      },
    })

    if (currentUser && currentSolAddress !== solAddress) {
      await prisma.userActivityLog.create({
        data: {
          userId: currentUser.id,
          action: SOL_WALLET_ACTIVITY_ACTION,
          detail: buildSolWalletAddressDetail(solAddress),
        },
      })
    }

    if (currentUser) {
      const changed: string[] = []
      if ((currentUser.btcWalletAddress || '') !== btcAddress) changed.push('BTC')
      if ((currentUser.ethWalletAddress || '') !== ethAddress) changed.push('ETH')
      if ((currentUser.ltcWalletAddress || '') !== ltcAddress) changed.push('LTC')
      if ((currentUser.walletAddress || '') !== usdtAddress) changed.push('USDT')
      if (currentSolAddress !== solAddress) changed.push('SOL')

      if (changed.length > 0) {
        await logUserActivity({
          userId: currentUser.id,
          action: 'WalletUpdated',
          detail: `Updated ${changed.join(', ')} wallet address.`,
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Update wallet error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
