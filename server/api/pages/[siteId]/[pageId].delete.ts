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

  // Only admin or site owner can delete pages
  if (session.user.role !== 'admin') {
    const membership = await db
      .select()
      .from(siteUsers)
      .where(and(eq(siteUsers.siteId, siteId), eq(siteUsers.userId, session.user.id)))
      .limit(1)

    if (!membership.length || membership[0]!.role !== 'owner') {
      throw createError({ statusCode: 403, message: 'Forbidden' })
    }
  }

  const [existing] = await db
    .select({ id: pages.id })
    .from(pages)
    .where(and(eq(pages.id, pageId), eq(pages.siteId, siteId)))
    .limit(1)

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Page not found' })
  }

  await db.delete(pages).where(eq(pages.id, pageId))

  await createAuditLog(session.user.id, 'delete_page', { siteId, pageId }, event)

  return { success: true }
})
