import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { rooms } from '#server/db/schema'
import { getClerkUser } from '#server/utils/auth'
import { requirePermission } from '#server/utils/permissions'
import { createAuditLog } from '#server/utils/audit'

const UpdateRoomSchema = z.object({
  name: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const userId = await getClerkUser(event)
  await requirePermission(userId, 'admin', 'manage_rooms')

  const { roomId } = getRouterParams(event)
  if (!roomId) {
    throw createError({ statusCode: 400, message: 'Missing route params' })
  }

  const body = await readBody(event)
  const result = UpdateRoomSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.issues[0]?.message ?? 'Invalid body',
    })
  }

  const db = useDrizzle()
  const [room] = await db
    .update(rooms)
    .set({ name: result.data.name, updatedAt: new Date() })
    .where(eq(rooms.id, roomId))
    .returning()

  if (!room) {
    throw createError({ statusCode: 404, message: 'Room not found' })
  }

  await createAuditLog(userId, 'update', { table: 'rooms', id: roomId }, event)

  return room
})
