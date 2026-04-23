import { requireUserSession } from '#server/utils/auth'
import { eq, and } from 'drizzle-orm'
import { pages, siteUsers } from '#server/db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const siteId = getRouterParam(event, 'siteId')
  const pageId = getRouterParam(event, 'pageId')

  if (!siteId || !pageId) {
    throw createError({ statusCode: 400, message: 'Missing siteId or pageId' })
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

  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.id, pageId), eq(pages.siteId, siteId)))
    .limit(1)

  if (!page) {
    throw createError({ statusCode: 404, message: 'Page not found' })
  }

  return page
})
