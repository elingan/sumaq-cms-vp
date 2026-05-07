import { z } from 'zod'
import { locationRooms } from '#server/db/schema'
import { getClerkUser } from '#server/utils/auth'
import { requirePermission } from '#server/utils/permissions'
import { createAuditLog } from '#server/utils/audit'

const CreateRoomSchema = z.object({
  name: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const userId = await getClerkUser(event)
  await requirePermission(userId, 'admin', 'manage_rooms')

  const { locationId } = getRouterParams(event)
  if (!locationId) {
    throw createError({ statusCode: 400, message: 'Missing route params' })
  }

  const body = await readBody(event)
  const result = CreateRoomSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.issues[0]?.message ?? 'Invalid body',
    })
  }

  const db = useDrizzle()
  const [room] = await db
    .insert(locationRooms)
    .values({ locationId, name: result.data.name })
    .returning()

  await createAuditLog(
    userId,
    'create',
    { table: 'location_rooms', id: room?.id, locationId },
    event,
  )

  return room
})
