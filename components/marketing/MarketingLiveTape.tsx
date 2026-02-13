'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type FeedRegion = {
  countries: string[]
  firstNames: string[]
  lastNames: string[]
}

type FeedItem = {
  id: string
  name: string
  country: string
  action: string
  value: string
  tone: 'deposit' | 'withdrawal' | 'plan'
}

const REGIONS: FeedRegion[] = [
  {
    countries: ['United States', 'Canada', 'Mexico'],
    firstNames: ['James', 'Olivia', 'Noah', 'Emma', 'Liam', 'Ava', 'Mason', 'Sophia'],
    lastNames: ['Smith', 'Johnson', 'Brown', 'Miller', 'Wilson', 'Clark', 'Taylor', 'Moore'],
  },
  {
    countries: ['Brazil', 'Argentina', 'Chile', 'Colombia', 'Peru'],
    firstNames: ['Mateo', 'Isabela', 'Thiago', 'Camila', 'Lucas', 'Valentina', 'Sofia', 'Rafael'],
    lastNames: ['Silva', 'Santos', 'Pereira', 'Gomez', 'Martinez', 'Lopez', 'Ramirez', 'Torres'],
  },
  {
    countries: ['United Kingdom', 'Ireland', 'Scotland', 'Wales'],
    firstNames: ['Oliver', 'Amelia', 'George', 'Isla', 'Harry', 'Freya', 'Jack', 'Elsie'],
    lastNames: ['Hughes', 'Davies', 'Evans', 'Walker', 'Cooper', 'Morgan', 'Bennett', 'Hall'],
  },
  {
    countries: ['Spain', 'Portugal', 'Italy', 'France'],
    firstNames: ['Alejandro', 'Lucia', 'Marco', 'Giulia', 'Enzo', 'Clara', 'Leo', 'Nora'],
    lastNames: ['Garcia', 'Fernandez', 'Costa', 'Rossi', 'Bianchi', 'Dubois', 'Moreau', 'Alvarez'],
  },
  {
    countries: ['Germany', 'Netherlands', 'Sweden', 'Switzerland', 'Poland'],
    firstNames: ['Lukas', 'Mia', 'Felix', 'Lina', 'Jonas', 'Hanna', 'Noah', 'Emilia'],
    lastNames: ['Schmidt', 'Muller', 'Weber', 'Fischer', 'Keller', 'Lindberg', 'Nowak', 'Svensson'],
  },
  {
    countries: ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Egypt'],
    firstNames: ['Chinedu', 'Ama', 'Kwame', 'Amina', 'Tariro', 'Nia', 'Kofi', 'Zuri'],
    lastNames: ['Okafor', 'Mensah', 'Adebayo', 'Ndlovu', 'Mwangi', 'Diallo', 'Abebe', 'Kone'],
  },
  {
    countries: ['India', 'Pakistan', 'Bangladesh', 'Sri Lanka'],
    firstNames: ['Arjun', 'Anaya', 'Kabir', 'Isha', 'Rohan', 'Mira', 'Ayaan', 'Zara'],
    lastNames: ['Patel', 'Sharma', 'Singh', 'Khan', 'Das', 'Perera', 'Rahman', 'Iyer'],
  },
  {
    countries: ['Japan', 'South Korea', 'Singapore', 'Australia', 'New Zealand'],
    firstNames: ['Haruto', 'Yui', 'Min-joon', 'Seo-yun', 'Kai', 'Ayla', 'Noa', 'Hina'],
    lastNames: ['Tanaka', 'Sato', 'Kim', 'Lee', 'Watanabe', 'Park', 'Nguyen', 'Yamamoto'],
  },
]

const MINING_PLANS = ['Starter Mining Plan', 'Advanced Mining Plan', 'Pro Mining Plan', 'Enterprise Mining Plan']
const TRADING_PLANS = ['Starter Trading Plan', 'Growth Trading Plan', 'Pro Trading Plan', 'Elite Trading Plan']
const REAL_ESTATE_PLANS = ['Real Estate Buy-In Tier 1', 'Real Estate Buy-In Tier 2', 'Real Estate Buy-In Tier 3']

function createSeededRng(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 4294967296
  }
}

function pick<T>(list: T[], rand: () => number) {
  return list[Math.floor(rand() * list.length)]
}

function formatUsd(value: number) {
  return `$${value.toLocaleString('en-US')}`
}

function generateFeedItems(count: number) {
  const rand = createSeededRng(817234)
  const items: FeedItem[] = []

  for (let index = 0; index < count; index += 1) {
    const region = pick(REGIONS, rand)
    const firstName = pick(region.firstNames, rand)
    const lastName = pick(region.lastNames, rand)
    const country = pick(region.countries, rand)
    const eventRoll = rand()

    if (eventRoll < 0.34) {
      const amount = Math.round(250 + rand() * 76000)
      items.push({
        id: `deposit-${index}`,
        name: `${firstName} ${lastName}`,
        country,
        action: 'deposited',
        value: formatUsd(amount),
        tone: 'deposit',
      })
      continue
    }

    if (eventRoll < 0.56) {
      const amount = Math.round(100 + rand() * 45000)
      items.push({
        id: `withdrawal-${index}`,
        name: `${firstName} ${lastName}`,
        country,
        action: 'withdrew',
        value: formatUsd(amount),
        tone: 'withdrawal',
      })
      continue
    }

    if (eventRoll < 0.74) {
      items.push({
        id: `mining-${index}`,
        name: `${firstName} ${lastName}`,
        country,
        action: 'activated',
        value: pick(MINING_PLANS, rand),
        tone: 'plan',
      })
      continue
    }

    if (eventRoll < 0.9) {
      items.push({
        id: `trading-${index}`,
        name: `${firstName} ${lastName}`,
        country,
        action: 'activated',
        value: pick(TRADING_PLANS, rand),
        tone: 'plan',
      })
      continue
    }

    items.push({
      id: `real-estate-${index}`,
      name: `${firstName} ${lastName}`,
      country,
      action: 'activated',
      value: pick(REAL_ESTATE_PLANS, rand),
      tone: 'plan',
    })
  }

  return items
}

export default function MarketingLiveTape() {
  const [isVisible, setIsVisible] = useState(true)
  const lastYRef = useRef(0)

  const tapeItems = useMemo(() => {
    const base = generateFeedItems(500)
    return [...base, ...base]
  }, [])

  useEffect(() => {
    lastYRef.current = window.scrollY

    const onScroll = () => {
      const currentY = window.scrollY
      const previousY = lastYRef.current

      if (currentY < 16) {
        setIsVisible(true)
      } else if (currentY < previousY - 4) {
        setIsVisible(false)
      } else if (currentY > previousY + 4) {
        setIsVisible(true)
      }

      lastYRef.current = currentY
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className={`bitryx-live-tape ${isVisible ? 'is-visible' : 'is-hidden'}`} aria-hidden="true">
      <div className="bitryx-live-tape__viewport">
        <div className="bitryx-live-tape__track">
          {tapeItems.map((item, index) => (
            <span key={`${item.id}-${index}`} className="bitryx-live-tape__item">
              <span className="bitryx-live-tape__name">{item.name}</span>
              <span className="bitryx-live-tape__country">{item.country}</span>
              <span className="bitryx-live-tape__verb">{item.action}</span>
              <span
                className={
                  item.tone === 'deposit'
                    ? 'bitryx-live-tape__value is-deposit'
                    : item.tone === 'withdrawal'
                    ? 'bitryx-live-tape__value is-withdrawal'
                    : 'bitryx-live-tape__value is-plan'
                }
              >
                {item.value}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
