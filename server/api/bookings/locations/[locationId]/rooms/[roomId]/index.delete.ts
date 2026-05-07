import { eq } from 'drizzle-orm'
import { locationRooms } from '#server/db/schema'
import { requireAdminRole } from '#server/utils/auth'
import { createAuditLog } from '#server/utils/audit'

export default defineEventHandler(async (event) => {
  const { userId } = await requireAdminRole(event)

  const { roomId } = getRouterParams(event)
  if (!roomId) {
    throw createError({ statusCode: 400, message: 'Missing route params' })
  }

  const db = useDrizzle()
  const [deleted] = await db
    .delete(locationRooms)
    .where(eq(locationRooms.id, roomId))
    .returning({ id: locationRooms.id })

  if (!deleted) {
    throw createError({ statusCode: 404, message: 'Room not found' })
  }

  await createAuditLog(userId, 'delete', { table: 'location_rooms', id: roomId }, event)

  return { success: true }
})
