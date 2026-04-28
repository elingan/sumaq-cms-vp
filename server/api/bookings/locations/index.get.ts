import { eq } from 'drizzle-orm'
import { locations, rooms } from '#server/db/schema'
import { requireUserSession } from '#server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const { add } = getQuery(event)
  const db = useDrizzle()

  if (add === 'rooms') {
    const rows = await db
      .select({
        id: locations.id,
        name: locations.name,
        address: locations.address,
        createdAt: locations.createdAt,
        updatedAt: locations.updatedAt,
        room: {
          id: rooms.id,
          name: rooms.name,
        },
      })
      .from(locations)
      .leftJoin(rooms, eq(rooms.locationId, locations.id))
      .orderBy(locations.name, rooms.name)

    const map = new Map<
      string,
      {
        id: string
        name: string
        address: string | null
        createdAt: Date
        updatedAt: Date
        rooms: Array<{ id: string; name: string }>
      }
    >()

    for (const row of rows) {
      if (!map.has(row.id)) {
        map.set(row.id, {
          id: row.id,
          name: row.name,
          address: row.address,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          rooms: [],
        })
      }
      if (row.room?.id) {
        map.get(row.id)!.rooms.push({ id: row.room.id, name: row.room.name })
      }
    }

    return Array.from(map.values())
  }

  return db.select().from(locations).orderBy(locations.name)
})
