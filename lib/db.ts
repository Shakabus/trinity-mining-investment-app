import { PrismaClient } from '@prisma/client'

const DEFAULT_CONNECTION_LIMIT = '3'
const DEFAULT_POOL_TIMEOUT_SECONDS = '20'

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

// Keep a single Prisma Client instance per runtime process.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prismaClientInstance =
  globalForPrisma.prisma ??
  new PrismaClient(
    tunedDatasourceUrl
      ? {
          datasourceUrl: tunedDatasourceUrl,
        }
      : undefined
  )

type UnsafePrismaClient = PrismaClient & {
  [key: string]: any
}

// Keep runtime behavior unchanged, but relax typing for dynamically accessed
// delegates (e.g. trading_* models in schema-mismatch environments).
export const prisma = prismaClientInstance as unknown as UnsafePrismaClient

globalForPrisma.prisma = prismaClientInstance
