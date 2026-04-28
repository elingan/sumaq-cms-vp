import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { locations } from '#server/db/schema'
import { requireAdminRole } from '#server/utils/auth'
import { createAuditLog } from '#server/utils/audit'

const UpdateLocationSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const { userId } = await requireAdminRole(event)

  const { locationId } = getRouterParams(event)

  if (!locationId) {
    throw createError({ statusCode: 400, message: 'Location ID is required' })
  }

  const body = await readBody(event)
  const result = UpdateLocationSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.issues[0]?.message ?? 'Invalid body',
    })
  }

  const db = useDrizzle()
  const [location] = await db
    .update(locations)
    .set({ ...result.data, updatedAt: new Date() })
    .where(eq(locations.id, locationId))
    .returning()

  if (!location) {
    throw createError({ statusCode: 404, message: 'Location not found' })
  }

  await createAuditLog(userId, 'update', { table: 'locations', id: location.id }, event)

  return location
})
