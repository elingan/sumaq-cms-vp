import { getDb } from '../db/client'

export function useDrizzle() {
  return getDb()
}
