import { eq } from 'drizzle-orm'
import { locations } from '#server/db/schema'
import { getClerkUser } from '#server/utils/auth'
import { requirePermission } from '#server/utils/permissions'
import { createAuditLog } from '#server/utils/audit'

export default defineEventHandler(async (event) => {
  const userId = await getClerkUser(event)
  await requirePermission(userId, 'admin', 'manage_locations')

  const { locationId } = getRouterParams(event)

  if (!locationId) {
    throw createError({ statusCode: 400, message: 'Location ID is required' })
  }

  const db = useDrizzle()
  const [deleted] = await db
    .delete(locations)
    .where(eq(locations.id, locationId))
    .returning({ id: locations.id })

  if (!deleted) {
    throw createError({ statusCode: 404, message: 'Location not found' })
  }

  await createAuditLog(userId, 'delete', { table: 'locations', id: deleted?.id }, event)

  return { success: true }
})
