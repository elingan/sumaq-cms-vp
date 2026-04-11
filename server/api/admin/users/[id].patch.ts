import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { users } from '~~/server/db/schema'

const PatchUserSchema = z.object({
  name: z.string().optional(),
  role: z.enum(['admin', 'partner', 'owner', 'editor']).optional(),
  password: z.string().min(8).optional(),
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  if (session.user.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing user id' })
  }

  const body = await readBody(event)
  const result = PatchUserSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.issues[0]?.message ?? 'Invalid input',
    })
  }

  const db = useDrizzle()

  const updates: Partial<typeof users.$inferInsert> = {
    name: result.data.name,
    role: result.data.role,
    updatedAt: new Date(),
  }

  if (result.data.password) {
    updates.password = await hashUserPassword(result.data.password)
  }

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, id))
    .returning({ id: users.id, email: users.email, name: users.name, role: users.role })

  if (!updated) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  await createAuditLog(session.user.id, 'update_user', { targetType: 'user', targetId: id }, event)

  return updated
})
