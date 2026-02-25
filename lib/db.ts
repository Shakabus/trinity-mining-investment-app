import { PrismaClient } from '@prisma/client'

const DEFAULT_CONNECTION_LIMIT = '5'
const DEFAULT_POOL_TIMEOUT_SECONDS = '45'
const DEFAULT_TX_MAX_WAIT_MS = 15_000
const DEFAULT_TX_TIMEOUT_MS = 35_000

function readPositiveIntEnv(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function withPrismaPoolTuning(databaseUrl: string) {
  try {
    const url = new URL(databaseUrl)

    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set(
        'connection_limit',
        process.env.PRISMA_CONNECTION_LIMIT || DEFAULT_CONNECTION_LIMIT
      )
    }

    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set(
        'pool_timeout',
        process.env.PRISMA_POOL_TIMEOUT_SECONDS || DEFAULT_POOL_TIMEOUT_SECONDS
      )
    }

    return url.toString()
  } catch {
    return databaseUrl
  }
}

const tunedDatasourceUrl = process.env.DATABASE_URL
  ? withPrismaPoolTuning(process.env.DATABASE_URL)
  : undefined
const txMaxWaitMs = readPositiveIntEnv(process.env.PRISMA_TX_MAX_WAIT_MS, DEFAULT_TX_MAX_WAIT_MS)
const txTimeoutMs = readPositiveIntEnv(process.env.PRISMA_TX_TIMEOUT_MS, DEFAULT_TX_TIMEOUT_MS)

// Keep a single Prisma Client instance per runtime process.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prismaClientInstance =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(tunedDatasourceUrl
      ? {
          datasourceUrl: tunedDatasourceUrl,
        }
      : {}),
    transactionOptions: {
      maxWait: txMaxWaitMs,
      timeout: txTimeoutMs,
    },
  })

type UnsafePrismaClient = PrismaClient & {
  [key: string]: any
}

// Keep runtime behavior unchanged, but relax typing for dynamically accessed
// delegates (e.g. trading_* models in schema-mismatch environments).
export const prisma = prismaClientInstance as unknown as UnsafePrismaClient

globalForPrisma.prisma = prismaClientInstance
