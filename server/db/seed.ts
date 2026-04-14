/**
 * Seed script: creates the admin account and emits a secure password link.
 * Run with: vp run seed
 */
import { drizzle } from 'drizzle-orm/pglite'
import { eq } from 'drizzle-orm'
import { PGlite } from '@electric-sql/pglite'
import { mkdirSync } from 'node:fs'
import { users } from './schema'
import { issuePasswordLink } from '../utils/password-links'

const dataDir = process.env.PGLITE_DATA_DIR || `${process.cwd()}/.data/pglite`
mkdirSync(dataDir, { recursive: true })
const client = new PGlite(dataDir)
const db = drizzle(client)

/** Create enums and tables if they don't exist yet (schema push). */
async function ensureSchema() {
  await client.exec(`
    DO $$ BEGIN
      CREATE TYPE user_role AS ENUM ('admin', 'partner', 'owner', 'editor');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE site_user_role AS ENUM ('owner', 'editor', 'partner');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE site_status AS ENUM ('active', 'archived');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE page_status AS ENUM ('draft', 'published');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE password_reset_purpose AS ENUM ('invite', 'reset');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password TEXT,
      name TEXT,
      role user_role NOT NULL DEFAULT 'editor',
      github_data JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id UUID,
      changes JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT UNIQUE NOT NULL,
      purpose password_reset_purpose NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE users
    ALTER COLUMN password DROP NOT NULL;

    ALTER TABLE password_resets
    ADD COLUMN IF NOT EXISTS token_hash TEXT;

    ALTER TABLE password_resets
    ADD COLUMN IF NOT EXISTS purpose password_reset_purpose;

    ALTER TABLE password_resets
    ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;

    DO $$ BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'password_resets'
          AND column_name = 'token'
      ) THEN
        ALTER TABLE password_resets
        ALTER COLUMN token DROP NOT NULL;
      END IF;
    END $$;

    CREATE UNIQUE INDEX IF NOT EXISTS password_resets_token_hash_unique
    ON password_resets (token_hash);

    CREATE INDEX IF NOT EXISTS idx_password_resets_user_id
    ON password_resets (user_id);

    CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at
    ON password_resets (expires_at);
  `)
}

async function seed() {
  console.log('Ensuring schema exists...')
  await ensureSchema()

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

  await client.close()
}

seed().catch(async (e) => {
  console.error('Seed failed:', e)
  await client.close()
  process.exit(1)
})
