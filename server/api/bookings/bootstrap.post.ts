import { and, eq } from 'drizzle-orm'
import { locations, rooms } from '#server/db/schema'
import { createAuditLog } from '#server/utils/audit'
import { requireAdminRole } from '#server/utils/auth'

const DEFAULT_LOCATIONS = [
  {
    name: 'Lend',
    address: 'Lend',
    rooms: ['Sala 1', 'Sala 2'],
  },
  {
    name: 'Annenhof',
    address: 'Annenhof',
    rooms: ['Sala 1', 'Sala 2'],
  },
  {
    name: 'Volksgarten',
    address: 'Volksgarten',
    rooms: ['Sala 1', 'Sala 2'],
  },
] as const

export default defineEventHandler(async (event) => {
  const { userId } = await requireAdminRole(event)
  const db = useDrizzle()

  let createdLocations = 0
  let createdRooms = 0

  for (const seedLocation of DEFAULT_LOCATIONS) {
    let [location] = await db
      .select()
      .from(locations)
      .where(eq(locations.name, seedLocation.name))
      .limit(1)

    if (!location) {
      const [inserted] = await db
        .insert(locations)
        .values({
          name: seedLocation.name,
          address: seedLocation.address,
        })
        .returning()

      location = inserted
      createdLocations += 1
    }

    for (const roomName of seedLocation.rooms) {
      const [existingRoom] = await db
        .select()
        .from(rooms)
        .where(and(eq(rooms.locationId, location!.id), eq(rooms.name, roomName)))
        .limit(1)

      if (!existingRoom) {
        await db
          .insert(rooms)
          .values({
            locationId: location!.id,
            name: roomName,
          })
          .returning()

        createdRooms += 1
      }
    }
  }

  await createAuditLog(
    userId,
    'bootstrap_booking_locations',
    {
      targetType: 'booking_bootstrap',
      createdLocations,
      createdRooms,
    },
    event,
  )

  return {
    success: true,
    createdLocations,
    createdRooms,
  }
})
