import { siteUsers, users } from '#server/db/schema'
import { requireAdminRole } from '#server/utils/auth'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireAdminRole(event)

  const siteId = getRouterParam(event, 'id')
  if (!siteId) {
    throw createError({ statusCode: 400, message: 'Missing site id' })
  }

  const db = useDrizzle()

  const owners = await db
    .select({
      id: siteUsers.userId,
      email: users.email,
      name: users.name,
      role: siteUsers.role,
      joinedAt: siteUsers.createdAt,
    })
    .from(siteUsers)
    .leftJoin(users, eq(siteUsers.userId, users.id))
    .where(eq(siteUsers.siteId, siteId))

  return owners
})
