'use client'

import { useMemo, useState } from 'react'
import styles from '@/components/marketing/OrderPayoutList.module.css'

type TabKey = 'orders' | 'completed'

type PlanRow = {
  name: string
  hashrate: string
  buyInPrice: string
  payoutPrice: string
  type: 'Mining'
}

type Row = {
  planName: string
  startDate: string
  endDate: string
  hashrate: string
  type: 'Mining'
  price: string
  status: 'Pending' | 'Completed'
}

const MINING_PLANS: PlanRow[] = [
  {
    name: 'Starter Plan',
    hashrate: '10 TH/s',
    buyInPrice: '$50.00',
    payoutPrice: '$95.00',
    type: 'Mining',
  },
  {
    name: 'Growth Plan',
    hashrate: '30 TH/s',
    buyInPrice: '$120.00',
    payoutPrice: '$235.00',
    type: 'Mining',
  },
  {
    name: 'Standard Plan',
    hashrate: '50 TH/s',
    buyInPrice: '$200.00',
    payoutPrice: '$420.00',
    type: 'Mining',
  },
  {
    name: 'Pro Plan',
    hashrate: '200 TH/s',
    buyInPrice: '$800.00',
    payoutPrice: '$1,920.00',
    type: 'Mining',
  },
  {
    name: 'VIP Plan',
    hashrate: '1,000 TH/s',
    buyInPrice: '$5,000.00',
    payoutPrice: '$13,500.00',
    type: 'Mining',
  },
  {
    name: 'Elite Multi-Asset Plan',
    hashrate: '1,000 TH/s',
    buyInPrice: '$12,000.00',
    payoutPrice: '$31,200.00',
    type: 'Mining',
  },
]

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function pickDurations() {
  return [30, 60, 90, 180, 365, 730][Math.floor(Math.random() * 6)]
}

function shuffle<T>(values: T[]): T[] {
  const copy = [...values]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function buildRows(status: 'Pending' | 'Completed'): Row[] {
  const plans = shuffle(MINING_PLANS)
  return plans.map(plan => {
    const duration = pickDurations()
    const now = new Date()
    const start = new Date(now)
    const end = new Date(now)

    if (status === 'Pending') {
      start.setDate(now.getDate())
      end.setDate(now.getDate() + duration)
    } else {
      end.setDate(now.getDate())
      start.setDate(now.getDate() - duration)
    }

    return {
      planName: plan.name,
      startDate: formatDate(start),
      endDate: formatDate(end),
      hashrate: plan.hashrate,
      type: plan.type,
      price: status === 'Pending' ? plan.buyInPrice : plan.payoutPrice,
      status,
    }
  })
}

export default function OrderPayoutList() {
  const [tab, setTab] = useState<TabKey>('orders')
  const pendingRows = useMemo(() => buildRows('Pending'), [])
  const completedRows = useMemo(() => buildRows('Completed'), [])
  const rows = tab === 'orders' ? pendingRows : completedRows

  return (
    <section className={styles.section}>
      <div className={styles.headingWrap}>
        <h2 className={styles.title}>Order &amp; Payout List</h2>
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
              <th>Hashpower</th>
              <th>Type</th>
              <th>Price</th>
              <th>Order Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={`${tab}-${row.planName}-${row.startDate}`}>
                <td>{row.planName}</td>
                <td>{row.startDate}</td>
                <td>{row.endDate}</td>
                <td>{row.hashrate}</td>
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
