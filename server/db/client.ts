import type { DrizzleConfig } from 'drizzle-orm'
import * as schema from './schema'

// Shared Drizzle config for both PGlite and Neon
const config: DrizzleConfig<typeof schema> = { schema }

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
let _db: ReturnType<typeof createPgliteDb> | null = null

function createNeonDb() {
  const { neon } = require('@neondatabase/serverless')
  const { drizzle } = require('drizzle-orm/neon-http')
  const sql = neon(process.env.DATABASE_URL!)
  return drizzle(sql, config)
}

function createPgliteDb() {
  const { PGlite } = require('@electric-sql/pglite')
  const { drizzle } = require('drizzle-orm/pglite')
  const client = new PGlite('./.data/pglite')
  return drizzle(client, config)
}

export function getDb() {
  if (_db) return _db

  if (process.env.DATABASE_URL) {
    _db = createNeonDb()
  } else {
    _db = createPgliteDb()
  }

  return _db
}

export type Database = ReturnType<typeof getDb>
