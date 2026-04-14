import { PGlite } from '@electric-sql/pglite'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import type { DrizzleConfig } from 'drizzle-orm'
import * as schema from './schema'

// Shared Drizzle config for both PGlite and Neon
const config: DrizzleConfig<typeof schema> = { schema }

type NeonDatabase = ReturnType<typeof createNeonDb>
type PGliteDatabase = ReturnType<typeof createPgliteDb>

let _db: NeonDatabase | PGliteDatabase | null = null

function createNeonDb() {
  const { neon } = require('@neondatabase/serverless')
  const { drizzle } = require('drizzle-orm/neon-http')
  const sql = neon(process.env.DATABASE_URL!)
  return drizzle(sql, config)
}

function createPgliteDb() {
  const pgliteDataDir = process.env.PGLITE_DATA_DIR || `${process.cwd()}/.data/pglite`
  const client = new PGlite(pgliteDataDir)
  return drizzlePglite(client, config)
}

export function getDb(): NeonDatabase | PGliteDatabase {
  if (_db) return _db

  if (process.env.DATABASE_URL) {
    _db = createNeonDb()
  } else {
    _db = createPgliteDb()
  }

  return _db
}

export type Database = ReturnType<typeof getDb>
