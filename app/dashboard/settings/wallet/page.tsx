import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import WalletSettingsForm from '@/components/dashboard/WalletSettingsForm'
import { getLatestSolWalletAddress } from '@/lib/wallet-addresses'

export default async function SettingsWalletPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  })
  const solAddress = user ? await getLatestSolWalletAddress(user.id) : ''

  return (
    <div
      className="p-8 rounded-3xl"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
      }}
    >
      <h2 className="text-2xl font-bold text-white mb-2">Withdrawal Wallet</h2>
      <p className="text-white/70 mb-6">Add your cryptocurrency wallet addresses for payout destinations</p>

      <WalletSettingsForm
        btcAddress={user?.btcWalletAddress || ''}
        ethAddress={user?.ethWalletAddress || ''}
        ltcAddress={user?.ltcWalletAddress || ''}
        usdtAddress={user?.walletAddress || ''}
        solAddress={solAddress}
      />
    </div>
  )
}
