/**
 * Seed script: creates the admin account and emits a secure password link.
 * Run with: vp run seed
 */
import { createClient } from '@libsql/client'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/libsql'
import { mkdirSync } from 'node:fs'
import { users } from './schema'
import { issuePasswordLink } from '../utils/password-links'

const dataDir = `${process.cwd()}/.data/db`
mkdirSync(dataDir, { recursive: true })

const url = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL || `file:${dataDir}/sqlite.db`
const authToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN

const client = createClient({
  url,
  authToken,
})
const db = drizzle(client)

async function seed() {
  console.log('Using existing migrated schema (NuxtHub)...')

  console.log('Ensuring admin user exists...')

  const [createdAdmin] = await db
    .insert(users)
    .values({
      email: 'admin@sumaq.io',
      password: null,
      name: 'Sumaq Admin',
      role: 'admin',
    })
    .onConflictDoNothing()
    .returning()

  const [existingAdmin] = createdAdmin
    ? [createdAdmin]
    : await db
        .select({
          id: users.id,
          email: users.email,
          password: users.password,
        })
        .from(users)
        .where(eq(users.email, 'admin@sumaq.io'))
        .limit(1)

  if (!existingAdmin) {
    throw new Error('Admin user could not be created or loaded')
  }

  const purpose = existingAdmin.password ? 'reset' : 'invite'
  const passwordLink = await issuePasswordLink({
    db,
    userId: existingAdmin.id,
    purpose,
  })

  console.log('')
  console.log('✓ Seed complete!')
  console.log('')
  console.log('  Admin account:')
  console.log('    Email: admin@sumaq.io')
  console.log(`    Purpose: ${purpose}`)
  console.log(`    Link: ${passwordLink.link}`)
  console.log('')

  client.close()
}

seed().catch(async (e) => {
  console.error('Seed failed:', e)
  client.close()
  process.exit(1)
})
