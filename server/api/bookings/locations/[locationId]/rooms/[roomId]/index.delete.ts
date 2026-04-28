import { eq } from 'drizzle-orm'
import { rooms } from '#server/db/schema'
import { requireAdminRole } from '#server/utils/auth'
import { createAuditLog } from '#server/utils/audit'

export default defineEventHandler(async (event) => {
  const { userId } = await requireAdminRole(event)

  const { roomId } = getRouterParams(event)
  if (!roomId) {
    throw createError({ statusCode: 400, message: 'Missing route params' })
  }

  console.log('Deleting room with ID:', roomId)

  const db = useDrizzle()
  const [deleted] = await db.delete(rooms).where(eq(rooms.id, roomId)).returning({ id: rooms.id })

  if (!deleted) {
    throw createError({ statusCode: 404, message: 'Room not found' })
  }

  await createAuditLog(userId, 'delete', { table: 'rooms', id: roomId }, event)

  return { success: true }
})
