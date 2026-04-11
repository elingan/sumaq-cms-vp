import { eq, and } from 'drizzle-orm'
import { sites, siteUsers } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing site id' })
  }

  const db = useDrizzle()

  const [site] = await db.select().from(sites).where(eq(sites.id, id)).limit(1)

  if (!site) {
    throw createError({ statusCode: 404, message: 'Site not found' })
  }

  // Admins can see any site; others must be a member
  if (session.user.role !== 'admin') {
    const [membership] = await db
      .select()
      .from(siteUsers)
      .where(and(eq(siteUsers.siteId, id), eq(siteUsers.userId, session.user.id)))
      .limit(1)

    if (!membership) {
      throw createError({ statusCode: 403, message: 'Forbidden' })
    }
  }

  return site
})
