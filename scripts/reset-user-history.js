const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

function loadDatabaseUrlFromEnvLocal() {
  if (process.env.DATABASE_URL) return

  const envLocalPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envLocalPath)) return

  const lines = fs.readFileSync(envLocalPath, 'utf8').split(/\r?\n/)
  const databaseUrlLine = lines.find(line => line.trim().startsWith('DATABASE_URL='))
  if (!databaseUrlLine) return

  const rawValue = databaseUrlLine.slice(databaseUrlLine.indexOf('=') + 1).trim()
  const unquotedValue =
    (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
    (rawValue.startsWith("'") && rawValue.endsWith("'"))
      ? rawValue.slice(1, -1)
      : rawValue

  if (unquotedValue) {
    process.env.DATABASE_URL = unquotedValue
  }
}

loadDatabaseUrlFromEnvLocal()

const prisma = new PrismaClient()

const HISTORY_TABLES = [
  'support_messages',
  'support_tickets',
  'referral_bonuses',
  'referral_withdrawals',
  'trading_withdrawals',
  'withdrawals',
  'trading_payments',
  'payments',
  'trading_earnings',
  'trading_stats',
  'earnings',
  'mining_stats',
  'multi_asset_allocations',
  'user_plans',
  'trading_user_plans',
  'user_activity_logs',
  'admin_activity_logs',
]

function tableExists(existingTables, tableName) {
  return existingTables.has(tableName)
}

async function getExistingTables() {
  const rows = await prisma.$queryRawUnsafe('SHOW TABLES')
  const names = rows.map(row => String(Object.values(row)[0]))
  return new Set(names)
}

async function countTable(tableName) {
  const rows = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS count FROM \`${tableName}\``)
  return Number(rows?.[0]?.count ?? 0)
}

async function countAdmins() {
  const rows = await prisma.$queryRawUnsafe("SELECT COUNT(*) AS count FROM `users` WHERE `role` = 'admin'")
  return Number(rows?.[0]?.count ?? 0)
}

async function countActiveUsers() {
  const rows = await prisma.$queryRawUnsafe(
    "SELECT COUNT(*) AS count FROM `users` WHERE `account_status` = 'active'"
  )
  return Number(rows?.[0]?.count ?? 0)
}

async function getCounts(existingTables) {
  const counts = {
    users: tableExists(existingTables, 'users') ? await countTable('users') : 0,
    admins: tableExists(existingTables, 'users') ? await countAdmins() : 0,
    activeUsers: tableExists(existingTables, 'users') ? await countActiveUsers() : 0,
  }

  for (const table of HISTORY_TABLES) {
    counts[table] = tableExists(existingTables, table) ? await countTable(table) : 0
  }

  return counts
}

function printCounts(title, counts) {
  console.log(`\n${title}`)
  console.table(counts)
}

async function main() {
  const shouldApply = process.argv.includes('--apply')
  const existingTables = await getExistingTables()
  const before = await getCounts(existingTables)
  printCounts('Current record counts', before)

  if (!shouldApply) {
    console.log('\nDry run complete. Re-run with --apply to clear user history.')
    return
  }

  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0')
  try {
    for (const table of HISTORY_TABLES) {
      if (!tableExists(existingTables, table)) continue
      await prisma.$executeRawUnsafe(`DELETE FROM \`${table}\``)
    }
    if (tableExists(existingTables, 'users')) {
      await prisma.$executeRawUnsafe("UPDATE `users` SET `account_status` = 'inactive'")
    }
  } finally {
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1')
  }

  const after = await getCounts(existingTables)
  printCounts('Record counts after reset', after)
  console.log('\nDone. User accounts were kept, admin roles were not modified, and all accounts were set to inactive.')
}

main()
  .catch(error => {
    console.error('Failed to reset user history:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
