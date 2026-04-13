/**
 * Seed script: populates the database with initial demo data.
 * Run with: pnpm tsx server/db/seed.ts
 */
import { drizzle } from 'drizzle-orm/pglite'
import { PGlite } from '@electric-sql/pglite'
import { mkdirSync } from 'node:fs'
import { hashSync } from 'bcryptjs'
import { users, sites, siteUsers, pages } from './schema'

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

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      role user_role NOT NULL DEFAULT 'editor',
      github_data JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug TEXT UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      language TEXT NOT NULL DEFAULT 'en',
      domain TEXT,
      site_url TEXT,
      screenshot_url TEXT,
      github_repo_url TEXT,
      github_branch TEXT NOT NULL DEFAULT 'main',
      vercel_project_id TEXT,
      vercel_url TEXT,
      template TEXT NOT NULL DEFAULT 'blank',
      status site_status NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS site_users (
      site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role site_user_role NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (site_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS pages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'page',
      name TEXT NOT NULL,
      title TEXT,
      content_json JSONB,
      schema_yaml TEXT,
      status page_status NOT NULL DEFAULT 'draft',
      published_at TIMESTAMPTZ,
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
  `)
}

async function seed() {
  console.log('Ensuring schema exists...')
  await ensureSchema()

  console.log('Seeding admin user...')
  const [admin] = await db
    .insert(users)
    .values({
      email: 'admin@sumaq.io',
      password: hashSync('Admin123!', 10),
      name: 'Sumaq Admin',
      role: 'admin',
    })
    .onConflictDoNothing()
    .returning()

  if (!admin) {
    console.log('Admin user already exists — skipping.')
    await client.close()
    process.exit(0)
  }

  console.log('Seeding demo site...')
  const [site] = await db
    .insert(sites)
    .values({
      name: 'Mi Sitio Demo',
      slug: 'demo',
      description: 'A demo site created by the seed script.',
      language: 'es',
      template: 'therapy',
      status: 'active',
    })
    .onConflictDoNothing()
    .returning()

  if (!site) {
    console.log('Demo site already exists — skipping.')
    await client.close()
    process.exit(0)
  }

  console.log('Assigning admin as site owner...')
  await db
    .insert(siteUsers)
    .values({
      siteId: site.id,
      userId: admin.id,
      role: 'owner',
    })
    .onConflictDoNothing()

  console.log('Creating homepage page...')
  await db
    .insert(pages)
    .values({
      siteId: site.id,
      type: 'page',
      name: 'index',
      title: 'Homepage',
      status: 'draft',
    })
    .onConflictDoNothing()

  console.log('')
  console.log('✓ Seed complete!')
  console.log('')
  console.log('  Admin credentials:')
  console.log('    Email:    admin@sumaq.io')
  console.log('    Password: Admin123!')
  console.log('')

  await client.close()
}

seed().catch(async (e) => {
  console.error('Seed failed:', e)
  await client.close()
  process.exit(1)
})
