import { locations } from '#server/db/schema'
import { requireUserSession } from '#server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  const db = useDrizzle()

  return db.select().from(locations).orderBy(locations.name)
})
