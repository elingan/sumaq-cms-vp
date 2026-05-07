import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { locationRooms } from '#server/db/schema'
import { getClerkUser } from '#server/utils/auth'
import { requirePermission } from '#server/utils/permissions'
import { createAuditLog } from '#server/utils/audit'

const UpdateRoomSchema = z.object({
  name: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const method = event.method?.toUpperCase()

  if (method !== 'PATCH' && method !== 'DELETE') {
    throw createError({ statusCode: 405, message: 'Method not allowed' })
  }

  const userId = await getClerkUser(event)
  await requirePermission(userId, 'admin', 'manage_rooms')

  const { locationId, roomId } = getRouterParams(event)
  if (!locationId || !roomId) {
    throw createError({ statusCode: 400, message: 'Missing route params' })
  }

  const db = useDrizzle()

  if (method === 'PATCH') {
    const body = await readBody(event)
    const result = UpdateRoomSchema.safeParse(body)

    if (!result.success) {
      throw createError({
        statusCode: 400,
        message: result.error.issues[0]?.message ?? 'Invalid body',
      })
    }

    const [room] = await db
      .update(locationRooms)
      .set({ name: result.data.name, updatedAt: new Date() })
      .where(and(eq(locationRooms.id, roomId), eq(locationRooms.locationId, locationId)))
      .returning()

    if (!room) {
      throw createError({ statusCode: 404, message: 'Room not found' })
    }

    await createAuditLog(
      userId,
      'update',
      { table: 'location_rooms', id: roomId, locationId },
      event,
    )

    return room
  }

  const [deleted] = await db
    .delete(locationRooms)
    .where(and(eq(locationRooms.id, roomId), eq(locationRooms.locationId, locationId)))
    .returning({ id: locationRooms.id })

  if (!deleted) {
    throw createError({ statusCode: 404, message: 'Room not found' })
  }

  await createAuditLog(userId, 'delete', { table: 'location_rooms', id: roomId, locationId }, event)

  return { success: true }
})
