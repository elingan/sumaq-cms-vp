import { eq, and } from 'drizzle-orm'
import { sites, siteUsers } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing site id' })
  }

  if (session.user.role === 'editor') {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const db = useDrizzle()

  // Verify owner access for non-admins
  if (session.user.role !== 'admin') {
    const [membership] = await db
      .select()
      .from(siteUsers)
      .where(
        and(
          eq(siteUsers.siteId, id),
          eq(siteUsers.userId, session.user.id),
          eq(siteUsers.role, 'owner'),
        ),
      )
      .limit(1)

    if (!membership) {
      throw createError({ statusCode: 403, message: 'Forbidden' })
    }
  }

  // Soft delete — set status to archived
  const [archived] = await db
    .update(sites)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(eq(sites.id, id))
    .returning()

  if (!archived) {
    throw createError({ statusCode: 404, message: 'Site not found' })
  }

  await createAuditLog(session.user.id, 'archive_site', { targetType: 'site', targetId: id }, event)

  return archived
})
