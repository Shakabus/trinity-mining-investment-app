export type FeedRegion = {
  countries: string[]
  firstNames: string[]
  lastNames: string[]
}

type FeedPerson = {
  name: string
  country: string
}

export type MarketingLiveFeedItem = {
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
    firstNames: ['James', 'Olivia', 'Noah', 'Emma', 'Liam', 'Ava', 'Mason', 'Sophia', 'Ethan', 'Mia', 'Logan', 'Charlotte', 'Daniel', 'Harper', 'Wyatt', 'Amelia'],
    lastNames: ['Smith', 'Johnson', 'Brown', 'Miller', 'Wilson', 'Clark', 'Taylor', 'Moore', 'Anderson', 'Thomas', 'Harris', 'Lewis', 'Walker', 'Young', 'King', 'Wright'],
  },
  {
    countries: ['Brazil', 'Argentina', 'Chile', 'Colombia', 'Peru'],
    firstNames: ['Mateo', 'Isabela', 'Thiago', 'Camila', 'Lucas', 'Valentina', 'Sofia', 'Rafael', 'Davi', 'Antonella', 'Gael', 'Manuela', 'Pedro', 'Julieta', 'Diego', 'Renata'],
    lastNames: ['Silva', 'Santos', 'Pereira', 'Gomez', 'Martinez', 'Lopez', 'Ramirez', 'Torres', 'Castro', 'Morales', 'Rojas', 'Mendoza', 'Suarez', 'Ortiz', 'Vargas', 'Ferreira'],
  },
  {
    countries: ['United Kingdom', 'Ireland', 'Scotland', 'Wales'],
    firstNames: ['Oliver', 'Amelia', 'George', 'Isla', 'Harry', 'Freya', 'Jack', 'Elsie', 'Arthur', 'Ivy', 'Leo', 'Matilda', 'Theo', 'Rosie', 'Oscar', 'Poppy'],
    lastNames: ['Hughes', 'Davies', 'Evans', 'Walker', 'Cooper', 'Morgan', 'Bennett', 'Hall', 'Roberts', 'Morris', 'Edwards', 'Green', 'Price', 'Bell', 'Turner', 'Ward'],
  },
  {
    countries: ['Spain', 'Portugal', 'Italy', 'France'],
    firstNames: ['Alejandro', 'Lucia', 'Marco', 'Giulia', 'Enzo', 'Clara', 'Leo', 'Nora', 'Sergio', 'Beatriz', 'Luca', 'Chiara', 'Matteo', 'Elisa', 'Adrien', 'Sofia'],
    lastNames: ['Garcia', 'Fernandez', 'Costa', 'Rossi', 'Bianchi', 'Dubois', 'Moreau', 'Alvarez', 'Romero', 'Navarro', 'Esposito', 'Ricci', 'Leclerc', 'Fontaine', 'Marin', 'Vidal'],
  },
  {
    countries: ['Germany', 'Netherlands', 'Sweden', 'Switzerland', 'Poland'],
    firstNames: ['Lukas', 'Mia', 'Felix', 'Lina', 'Jonas', 'Hanna', 'Noah', 'Emilia', 'Anton', 'Greta', 'Max', 'Leonie', 'Tobias', 'Nina', 'Erik', 'Anja'],
    lastNames: ['Schmidt', 'Muller', 'Weber', 'Fischer', 'Keller', 'Lindberg', 'Nowak', 'Svensson', 'Schneider', 'Wagner', 'Meier', 'Hoffmann', 'Bergman', 'Johansson', 'Kowalski', 'Zielinski'],
  },
  {
    countries: ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Egypt'],
    firstNames: ['Chinedu', 'Ama', 'Kwame', 'Amina', 'Tariro', 'Nia', 'Kofi', 'Zuri', 'Tunde', 'Esi', 'Ife', 'Nala', 'Abiola', 'Lerato', 'Sizwe', 'Thandi'],
    lastNames: ['Okafor', 'Mensah', 'Adebayo', 'Ndlovu', 'Mwangi', 'Diallo', 'Abebe', 'Kone', 'Balogun', 'Boateng', 'Adeyemi', 'Chukwu', 'Mbeki', 'Dlamini', 'Afolayan', 'Banda'],
  },
  {
    countries: ['India', 'Pakistan', 'Bangladesh', 'Sri Lanka'],
    firstNames: ['Arjun', 'Anaya', 'Kabir', 'Isha', 'Rohan', 'Mira', 'Ayaan', 'Zara', 'Vihaan', 'Aditi', 'Dev', 'Sana', 'Ibrahim', 'Nisha', 'Rehan', 'Tara'],
    lastNames: ['Patel', 'Sharma', 'Singh', 'Khan', 'Das', 'Perera', 'Rahman', 'Iyer', 'Chowdhury', 'Malik', 'Kulkarni', 'Kapoor', 'Qureshi', 'Hossain', 'Fernando', 'Subramanian'],
  },
  {
    countries: ['Japan', 'South Korea', 'Singapore', 'Australia', 'New Zealand'],
    firstNames: ['Haruto', 'Yui', 'Min-joon', 'Seo-yun', 'Kai', 'Ayla', 'Noa', 'Hina', 'Ren', 'Mei', 'Ji-ho', 'Hae-won', 'Sora', 'Mika', 'Riku', 'Aoi'],
    lastNames: ['Tanaka', 'Sato', 'Kim', 'Lee', 'Watanabe', 'Park', 'Nguyen', 'Yamamoto', 'Kobayashi', 'Ito', 'Choi', 'Jeong', 'Lim', 'Tan', 'Mori', 'Nakamura'],
  },
]

const MINING_PLANS = [
  'Starter Mining Plan',
  'Advanced Mining Plan',
  'Pro Mining Plan',
  'Enterprise Mining Plan',
  'Starter Mining Plan - 7 Days',
  'Advanced Mining Plan - 30 Days',
  'Pro Mining Plan - 60 Days',
  'Enterprise Mining Plan - 90 Days',
  'Mining Booster Allocation',
  'Mining Scale-Up Tier',
]

const TRADING_PLANS = [
  'Starter Trading Plan',
  'Growth Trading Plan',
  'Pro Trading Plan',
  'Elite Trading Plan',
  'Starter Trading Plan - 7 Days',
  'Growth Trading Plan - 30 Days',
  'Pro Trading Plan - 60 Days',
  'Elite Trading Plan - 90 Days',
  'Momentum Trading Allocation',
  'High-Frequency Trading Tier',
]

const REAL_ESTATE_PLANS = [
  'Real Estate Buy-In Tier 1',
  'Real Estate Buy-In Tier 2',
  'Real Estate Buy-In Tier 3',
  'Real Estate Buy-In Tier 4',
  'Prime Property Buy-In',
  'Commercial Property Buy-In',
  'Residential Property Buy-In',
  'Luxury Portfolio Buy-In',
]

const PLAN_ACTIONS = [
  'activated',
  'started',
  'secured',
  'upgraded to',
  'moved into',
  'switched to',
  'subscribed to',
  'enrolled in',
  'allocated into',
  'configured',
  'enabled',
  'expanded into',
  'initiated',
  'joined',
  'selected',
  'locked in',
  'adopted',
  'entered',
]

const DEPOSIT_ACTIONS = [
  'deposited',
  'funded',
  'added capital',
  'allocated funds',
  'boosted balance',
  'increased funding',
  'recharged account',
  'deployed capital',
  'committed funds',
  'posted deposit',
  'confirmed funding',
  'topped up',
]

const WITHDRAWAL_ACTIONS = [
  'withdrew',
  'requested withdrawal',
  'processed withdrawal',
  'completed payout',
  'realized withdrawal',
  'secured payout',
  'released withdrawal',
  'confirmed withdrawal',
  'claimed payout',
  'finalized withdrawal',
  'settled withdrawal',
  'executed payout',
]

const MIN_AMOUNT = 50
const MAX_AMOUNT = 250000

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

function shuffleInPlace<T>(items: T[], rand: () => number) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rand() * (index + 1))
    const temp = items[index]
    items[index] = items[swapIndex]
    items[swapIndex] = temp
  }
}

function formatUsd(value: number) {
  return `$${value.toLocaleString('en-US')}`
}

function buildPeoplePool(rand: () => number) {
  const seen = new Set<string>()
  const people: FeedPerson[] = []

  for (const region of REGIONS) {
    for (const firstName of region.firstNames) {
      for (const lastName of region.lastNames) {
        const name = `${firstName} ${lastName}`
        if (seen.has(name)) continue

        seen.add(name)
        people.push({
          name,
          country: pick(region.countries, rand),
        })
      }
    }
  }

  shuffleInPlace(people, rand)
  return people
}

function buildPlanActivations(rand: () => number) {
  const plans = [...MINING_PLANS, ...TRADING_PLANS, ...REAL_ESTATE_PLANS]
  const activations: Array<{ action: string; value: string }> = []

  for (const action of PLAN_ACTIONS) {
    for (const plan of plans) {
      activations.push({ action, value: plan })
    }
  }

  shuffleInPlace(activations, rand)
  return activations
}

function pickUniqueAmount(rand: () => number, usedAmounts: Set<number>) {
  const range = MAX_AMOUNT - MIN_AMOUNT + 1
  if (usedAmounts.size >= range) {
    return MIN_AMOUNT
  }

  let amount = MIN_AMOUNT + Math.floor(rand() * range)
  while (usedAmounts.has(amount)) {
    amount = MIN_AMOUNT + Math.floor(rand() * range)
  }

  usedAmounts.add(amount)
  return amount
}

export function generateMarketingLiveFeed(count: number, seed = 817234) {
  const rand = createSeededRng(seed)
  const peoplePool = buildPeoplePool(rand)
  const planActivations = buildPlanActivations(rand)
  const usedAmounts = new Set<number>()
  const items: MarketingLiveFeedItem[] = []
  let depositActionIndex = 0
  let withdrawalActionIndex = 0
  let planActivationIndex = 0

  for (let index = 0; index < count; index += 1) {
    const person = peoplePool[index % peoplePool.length]
    const eventRoll = rand()

    if (eventRoll < 0.37) {
      const amount = pickUniqueAmount(rand, usedAmounts)
      const action = DEPOSIT_ACTIONS[depositActionIndex % DEPOSIT_ACTIONS.length]
      depositActionIndex += 1
      items.push({
        id: `deposit-${index}`,
        name: person.name,
        country: person.country,
        action,
        value: formatUsd(amount),
        tone: 'deposit',
      })
      continue
    }

    if (eventRoll < 0.63) {
      const amount = pickUniqueAmount(rand, usedAmounts)
      const action = WITHDRAWAL_ACTIONS[withdrawalActionIndex % WITHDRAWAL_ACTIONS.length]
      withdrawalActionIndex += 1
      items.push({
        id: `withdrawal-${index}`,
        name: person.name,
        country: person.country,
        action,
        value: formatUsd(amount),
        tone: 'withdrawal',
      })
      continue
    }

    const activation = planActivations[planActivationIndex % planActivations.length]
    planActivationIndex += 1
    items.push({
      id: `real-estate-${index}`,
      name: person.name,
      country: person.country,
      action: activation.action,
      value: activation.value,
      tone: 'plan',
    })
  }

  return items
}

export function generateWithdrawalFeed(count = 1000, seed = 817234) {
  return generateMarketingLiveFeed(count, seed).filter(item => item.tone === 'withdrawal')
}
