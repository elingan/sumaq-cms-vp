import { sql } from 'drizzle-orm'
import { users } from '#server/db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  if (session.user.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const db = useDrizzle()

  const result = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      hasPassword: sql<boolean>`${users.password} is not null`,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt)

  return result
})
