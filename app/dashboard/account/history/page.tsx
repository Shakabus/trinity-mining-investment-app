import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import {
  formatAccountBalanceSource,
  getAccountBalanceEntries,
} from '@/lib/account-balance'
import {
  convertUsd,
  formatCurrency,
  getFxRates,
  isSupportedCurrency,
  type CurrencyCode,
} from '@/lib/forex'

export const dynamic = 'force-dynamic'

const DEPOSIT_SOURCES = new Set([
  'funding_deposit',
  'external_payment',
  'external_trading_payment',
  'mining_withdrawal',
  'trading_withdrawal',
  'referral_withdrawal',
  'real_estate_withdrawal',
])

const PURCHASE_SOURCES = new Set([
  'mining_plan_purchase',
  'trading_plan_purchase',
  'real_estate_buy_in',
])

const WITHDRAWAL_SOURCES = new Set(['account_balance_withdrawal'])

function formatStatus(status: 'pending' | 'settled' | 'rejected') {
  if (status === 'settled') return 'Settled'
  if (status === 'rejected') return 'Rejected'
  return 'Pending'
}

export default async function AccountHistoryPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      id: true,
      preferredCurrency: true,
    },
  })
  if (!user) {
    redirect('/sign-in')
  }

  const entries = await getAccountBalanceEntries(user.id, { limit: 3000 })
  const rates = await getFxRates()
  const preferredCurrency: CurrencyCode = isSupportedCurrency(user.preferredCurrency || '')
    ? (user.preferredCurrency as CurrencyCode)
    : 'USD'
  const formatAmount = (amountUsd: number) =>
    formatCurrency(convertUsd(amountUsd, rates, preferredCurrency), preferredCurrency)
  const latestEntriesByReference = entries.reduce<Map<string, (typeof entries)[number]>>((map, entry) => {
    const key = `${entry.source}:${entry.direction}:${entry.referenceId}`
    const existing = map.get(key)
    if (!existing || existing.createdAt.getTime() < entry.createdAt.getTime()) {
      map.set(key, entry)
    }
    return map
  }, new Map())

  const historyRows = [...latestEntriesByReference.values()].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  )

  const summary = historyRows.reduce(
    (acc, row) => {
      if (row.status === 'pending') {
        acc.pendingCount += 1
      }
      if (row.status !== 'settled') {
        return acc
      }

      if (DEPOSIT_SOURCES.has(row.source) && row.direction === 'credit') {
        acc.depositsUsd += row.amountUsd
      }
      if (PURCHASE_SOURCES.has(row.source) && row.direction === 'debit') {
        acc.purchasesUsd += row.amountUsd
      }
      if (WITHDRAWAL_SOURCES.has(row.source) && row.direction === 'debit') {
        acc.withdrawalsUsd += row.amountUsd
      }
      if (row.direction === 'credit') {
        acc.totalCreditsUsd += row.amountUsd
      } else {
        acc.totalDebitsUsd += row.amountUsd
      }
      return acc
    },
    {
      depositsUsd: 0,
      purchasesUsd: 0,
      withdrawalsUsd: 0,
      totalCreditsUsd: 0,
      totalDebitsUsd: 0,
      pendingCount: 0,
    }
  )

  const availableUsd = Math.max(0, summary.totalCreditsUsd - summary.totalDebitsUsd)

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-6 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white">Account History</h1>
          <p className="text-white/70 mt-2">Deposits, purchases, withdrawals, and balance events.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/account/fund"
            className="px-4 py-2 rounded-full text-sm font-semibold"
            style={{
              background: 'linear-gradient(135deg, #10b981, #047857)',
              color: '#ffffff',
            }}
          >
            Fund Account
          </Link>
          <Link
            href="/dashboard/account/withdraw"
            className="px-4 py-2 rounded-full text-sm font-semibold"
            style={{
              background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
              color: '#ffffff',
            }}
          >
            Withdraw Funds
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {[
          { label: 'Total Deposits', value: summary.depositsUsd, tone: 'text-emerald-200' },
          { label: 'Total Purchases', value: summary.purchasesUsd, tone: 'text-amber-200' },
          { label: 'Total Withdrawals', value: summary.withdrawalsUsd, tone: 'text-rose-200' },
          { label: 'Available Balance', value: availableUsd, tone: 'text-white' },
          { label: 'Pending Items', value: summary.pendingCount, tone: 'text-blue-200', integer: true },
        ].map(card => (
          <div
            key={card.label}
            className="p-5 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div className="text-sm text-white/70">{card.label}</div>
            <div className={`text-2xl font-bold mt-1 ${card.tone}`}>
              {card.integer
                ? card.value.toLocaleString()
                : formatAmount(card.value)}
            </div>
          </div>
        ))}
      </div>

      <div
        className="p-4 md:p-6 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <h2 className="text-lg md:text-xl font-semibold text-white mb-4">Transaction Log</h2>
        {historyRows.length === 0 ? (
          <div className="text-sm text-white/65">No account history yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white/55 border-b border-white/10">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Direction</th>
                  <th className="py-2 pr-3">Amount ({preferredCurrency})</th>
                  <th className="py-2 pr-3">Wallet Coin</th>
                  <th className="py-2 pr-3">Coin Amount</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.map(row => {
                  const coinType =
                    typeof row.metadata?.coinType === 'string' ? row.metadata.coinType : '-'
                  const amountCryptoRaw = Number(row.metadata?.amountCrypto)
                  const amountCrypto =
                    Number.isFinite(amountCryptoRaw) && amountCryptoRaw > 0
                      ? amountCryptoRaw.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 8,
                        })
                      : '-'

                  return (
                    <tr key={row.id} className="border-b border-white/10 text-white/85 align-top">
                      <td className="py-3 pr-3 whitespace-nowrap">{row.createdAt.toLocaleString()}</td>
                      <td className="py-3 pr-3">{formatAccountBalanceSource(row.source)}</td>
                      <td className="py-3 pr-3">
                        <span
                          className="px-2 py-1 rounded-full text-xs font-semibold"
                          style={{
                            background:
                              row.status === 'settled'
                                ? 'rgba(16, 185, 129, 0.18)'
                                : row.status === 'rejected'
                                ? 'rgba(239, 68, 68, 0.18)'
                                : 'rgba(59, 130, 246, 0.18)',
                            color:
                              row.status === 'settled'
                                ? '#6ee7b7'
                                : row.status === 'rejected'
                                ? '#fecaca'
                                : '#bfdbfe',
                          }}
                        >
                          {formatStatus(row.status)}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <span className={row.direction === 'credit' ? 'text-emerald-300' : 'text-rose-300'}>
                          {row.direction === 'credit' ? 'Credit' : 'Debit'}
                        </span>
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        <span className={row.direction === 'credit' ? 'text-emerald-300' : 'text-rose-300'}>
                          {row.direction === 'credit' ? '+' : '-'}{formatAmount(row.amountUsd)}
                        </span>
                      </td>
                      <td className="py-3 pr-3">{coinType}</td>
                      <td className="py-3 pr-3 whitespace-nowrap">{amountCrypto}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
