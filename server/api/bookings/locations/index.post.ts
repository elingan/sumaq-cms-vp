import { z } from 'zod'
import { locations } from '#server/db/schema'
import { requireAdminRole } from '#server/utils/auth'
import { createAuditLog } from '#server/utils/audit'

const CreateLocationSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const { userId } = await requireAdminRole(event)

  const body = await readBody(event)
  const result = CreateLocationSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.issues[0]?.message ?? 'Invalid body',
    })
  }

  const db = useDrizzle()
  const [location] = await db.insert(locations).values(result.data).returning()

  await createAuditLog(userId, 'create', { table: 'locations', id: location?.id }, event)

  return location
})
