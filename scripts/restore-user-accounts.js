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

async function main() {
  console.log('Restoring user and admin accounts...')

  const existingAdmins = await prisma.user.count({ where: { role: 'admin' } })
  const inactiveUsers = await prisma.user.count({ where: { accountStatus: 'inactive' } })

  console.log(`Found ${existingAdmins} admin user(s) and ${inactiveUsers} inactive user(s).`)

  const updated = await prisma.user.updateMany({
    where: { accountStatus: 'inactive' },
    data: { accountStatus: 'active' },
  })

  console.log(`Activated ${updated.count} user account(s).`)

  if (existingAdmins === 0) {
    console.log('No admin users found. Please create an admin account manually in the database or via Clerk.')
  } else {
    console.log('Admin user roles were preserved.')
  }

  console.log('If you need to add a new admin, use Clerk to sign up a new user and then update the user record role to admin in the database.')
}

main()
  .catch(error => {
    console.error('Restore failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
