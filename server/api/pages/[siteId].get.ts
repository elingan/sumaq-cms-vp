import { eq, and } from 'drizzle-orm'
import { pages, siteUsers } from '#server/db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const siteId = getRouterParam(event, 'siteId')

  if (!siteId) {
    throw createError({ statusCode: 400, message: 'Missing siteId' })
  }

  const db = useDrizzle()

  // Non-admins must be a member of the site
  if (session.user.role !== 'admin') {
    const membership = await db
      .select()
      .from(siteUsers)
      .where(and(eq(siteUsers.siteId, siteId), eq(siteUsers.userId, session.user.id)))
      .limit(1)

    if (!membership.length) {
      throw createError({ statusCode: 403, message: 'Forbidden' })
    }
  }

  const result = await db
    .select({
      id: pages.id,
      siteId: pages.siteId,
      type: pages.type,
      name: pages.name,
      title: pages.title,
      status: pages.status,
      publishedAt: pages.publishedAt,
      createdAt: pages.createdAt,
      updatedAt: pages.updatedAt,
    })
    .from(pages)
    .where(eq(pages.siteId, siteId))
    .orderBy(pages.updatedAt)

  return result
})
