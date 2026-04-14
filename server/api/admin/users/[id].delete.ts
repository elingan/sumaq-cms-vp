import { eq } from 'drizzle-orm'
import { users } from '#server/db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  if (session.user.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing user id' })
  }

  // Prevent self-deletion
  if (id === session.user.id) {
    throw createError({ statusCode: 400, message: 'Cannot delete your own account' })
  }

  const db = useDrizzle()

  const [deleted] = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id })

  if (!deleted) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  await createAuditLog(session.user.id, 'delete_user', { targetType: 'user', targetId: id }, event)

  return { ok: true }
})
