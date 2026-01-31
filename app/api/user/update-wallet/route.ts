import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { logUserActivity } from '@/lib/user-activity'

function validateAddress(label: string, value: string) {
  if (!value) return null
  if (value.length < 10) return `${label} address looks too short.`
  if (value.length > 120) return `${label} address is too long.`

  const btcRegex = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/i
  const ethRegex = /^0x[a-fA-F0-9]{40}$/
  const ltcRegex = /^(ltc1|[LM3])[a-zA-HJ-NP-Z0-9]{25,62}$/i

  if (label === 'BTC' && !btcRegex.test(value)) return 'BTC address format looks invalid.'
  if (label === 'ETH' && !ethRegex.test(value)) return 'ETH address format looks invalid.'
  if (label === 'LTC' && !ltcRegex.test(value)) return 'LTC address format looks invalid.'

  return null
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const btcAddress = typeof body.btcAddress === 'string' ? body.btcAddress.trim() : ''
    const ethAddress = typeof body.ethAddress === 'string' ? body.ethAddress.trim() : ''
    const ltcAddress = typeof body.ltcAddress === 'string' ? body.ltcAddress.trim() : ''

    const btcError = validateAddress('BTC', btcAddress)
    const ethError = validateAddress('ETH', ethAddress)
    const ltcError = validateAddress('LTC', ltcAddress)

    if (btcError || ethError || ltcError) {
      return NextResponse.json({ error: btcError || ethError || ltcError }, { status: 400 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    })

    await prisma.user.update({
      where: { clerkUserId: userId },
      data: {
        btcWalletAddress: btcAddress || null,
        ethWalletAddress: ethAddress || null,
        ltcWalletAddress: ltcAddress || null,
      },
    })

    if (currentUser) {
      const changed: string[] = []
      if ((currentUser.btcWalletAddress || '') !== btcAddress) changed.push('BTC')
      if ((currentUser.ethWalletAddress || '') !== ethAddress) changed.push('ETH')
      if ((currentUser.ltcWalletAddress || '') !== ltcAddress) changed.push('LTC')

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
    console.error('Update wallet error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
