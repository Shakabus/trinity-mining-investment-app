'use client'

import { useMemo, useState } from 'react'
import styles from '@/components/marketing/OrderPayoutList.module.css'

type TabKey = 'orders' | 'completed'
type Variant = 'mining' | 'trading'

type MiningPlanRow = {
  name: string
  hashrate: string
  buyInPrice: string
  payoutPrice: string
  durationDays: number[]
  type: 'Mining'
}

type TradingPlanRow = {
  name: string
  minDurationHours: number
  maxDurationHours: number
  investmentUsd: number
  returnRate: number
  type: 'Investment'
}

type Row = {
  planName: string
  startDate: string
  endDate: string
  metric: string
  type: 'Mining' | 'Investment'
  price: string
  status: 'Pending' | 'Completed'
}

const MINING_PLANS: MiningPlanRow[] = [
  {
    name: 'Starter Plan',
    hashrate: '10 TH/s',
    buyInPrice: '$2,000.00',
    payoutPrice: '$3,800.00',
    durationDays: [7],
    type: 'Mining',
  },
  {
    name: 'Growth Plan',
    hashrate: '30 TH/s',
    buyInPrice: '$5,000.00',
    payoutPrice: '$9,800.00',
    durationDays: [7],
    type: 'Mining',
  },
  {
    name: 'Standard Plan',
    hashrate: '50 TH/s',
    buyInPrice: '$10,000.00',
    payoutPrice: '$21,000.00',
    durationDays: [7],
    type: 'Mining',
  },
  {
    name: 'Pro Plan',
    hashrate: '200 TH/s',
    buyInPrice: '$20,000.00',
    payoutPrice: '$48,000.00',
    durationDays: [7],
    type: 'Mining',
  },
  {
    name: 'VIP Plan',
    hashrate: '1,000 TH/s',
    buyInPrice: '$50,000.00',
    payoutPrice: '$135,000.00',
    durationDays: [7],
    type: 'Mining',
  },
  {
    name: 'Elite Multi-Asset Plan',
    hashrate: '1,000 TH/s',
    buyInPrice: '$100,000.00',
    payoutPrice: '$260,000.00',
    durationDays: [7],
    type: 'Mining',
  },
]

const TRADING_PLANS: TradingPlanRow[] = [
  {
    name: 'Mega Cloud Pack',
    minDurationHours: 35,
    maxDurationHours: 48,
    investmentUsd: 2000,
    returnRate: 2.12,
    type: 'Investment',
  },
  {
    name: 'Mega Cloud Pack',
    minDurationHours: 35,
    maxDurationHours: 48,
    investmentUsd: 9500,
    returnRate: 2.78,
    type: 'Investment',
  },
  {
    name: 'Top Premium Package',
    minDurationHours: 48,
    maxDurationHours: 72,
    investmentUsd: 10000,
    returnRate: 2.25,
    type: 'Investment',
  },
  {
    name: 'Top Premium Package',
    minDurationHours: 48,
    maxDurationHours: 72,
    investmentUsd: 42000,
    returnRate: 2.75,
    type: 'Investment',
  },
  {
    name: 'VIP Promo Pack',
    minDurationHours: 72,
    maxDurationHours: 96,
    investmentUsd: 50000,
    returnRate: 2.35,
    type: 'Investment',
  },
  {
    name: 'VIP Promo Pack',
    minDurationHours: 72,
    maxDurationHours: 96,
    investmentUsd: 120000,
    returnRate: 2.8,
    type: 'Investment',
  },
]

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function shuffle<T>(values: T[]): T[] {
  const copy = [...values]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function pickFrom<T>(values: T[]): T {
  return values[Math.floor(Math.random() * values.length)]
}

function randomHours(min: number, max: number): number {
  const span = max - min
  return min + Math.floor(Math.random() * (span + 1))
}

function buildMiningRows(status: 'Pending' | 'Completed'): Row[] {
  return shuffle(MINING_PLANS).map(plan => {
    const duration = pickFrom(plan.durationDays)
    const now = new Date()
    const start = new Date(now)
    const end = new Date(now)

    if (status === 'Pending') {
      end.setDate(now.getDate() + duration)
    } else {
      start.setDate(now.getDate() - duration)
    }

    return {
      planName: plan.name,
      startDate: formatDate(start),
      endDate: formatDate(end),
      metric: plan.hashrate,
      type: plan.type,
      price: status === 'Pending' ? plan.buyInPrice : plan.payoutPrice,
      status,
    }
  })
}

function buildTradingRows(status: 'Pending' | 'Completed'): Row[] {
  return shuffle(TRADING_PLANS).map(plan => {
    const now = new Date()
    const durationHours = randomHours(plan.minDurationHours, plan.maxDurationHours)
    const start = new Date(now)
    const end = new Date(now)

    if (status === 'Pending') {
      end.setHours(now.getHours() + durationHours)
    } else {
      start.setHours(now.getHours() - durationHours)
    }

    const payoutUsd = plan.investmentUsd * plan.returnRate

    return {
      planName: plan.name,
      startDate: formatDate(start),
      endDate: formatDate(end),
      metric: `${plan.returnRate.toFixed(2)}x`,
      type: plan.type,
      price: status === 'Pending' ? formatUsd(plan.investmentUsd) : formatUsd(payoutUsd),
      status,
    }
  })
}

function buildRows(variant: Variant, status: 'Pending' | 'Completed'): Row[] {
  return variant === 'trading' ? buildTradingRows(status) : buildMiningRows(status)
}

interface OrderPayoutListProps {
  variant?: Variant
  title?: string
}

export default function OrderPayoutList({
  variant = 'mining',
  title,
}: OrderPayoutListProps) {
  const [tab, setTab] = useState<TabKey>('orders')
  const pendingRows = useMemo(() => buildRows(variant, 'Pending'), [variant])
  const completedRows = useMemo(() => buildRows(variant, 'Completed'), [variant])
  const rows = tab === 'orders' ? pendingRows : completedRows

  const sectionTitle =
    title ||
    (variant === 'trading'
      ? 'Trading Investment Order & Payout List'
      : 'Mining Order & Payout List')

  const metricHeader = variant === 'trading' ? 'Return Rate' : 'Hashpower'

  return (
    <section className={styles.section}>
      <div className={styles.headingWrap}>
        <h2 className={styles.title}>{sectionTitle}</h2>
      </div>

      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tabBtn} ${tab === 'orders' ? styles.active : ''}`}
          onClick={() => setTab('orders')}
        >
          Orders
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${tab === 'completed' ? styles.active : ''}`}
          onClick={() => setTab('completed')}
        >
          Completed
        </button>
      </div>

      <div className={styles.wrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Order Created</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>{metricHeader}</th>
              <th>Type</th>
              <th>Price</th>
              <th>Order Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${tab}-${row.planName}-${row.startDate}-${index}`}>
                <td>{row.planName}</td>
                <td>{row.startDate}</td>
                <td>{row.endDate}</td>
                <td>{row.metric}</td>
                <td>{row.type}</td>
                <td>{row.price}</td>
                <td>
                  <span className={row.status === 'Pending' ? styles.pending : styles.completed}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
