import { eq, and } from 'drizzle-orm'
import { sites, siteUsers } from '#server/db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const siteId = getRouterParam(event, 'siteId')

  if (!siteId) {
    throw createError({ statusCode: 400, message: 'Missing siteId' })
  }

  const db = useDrizzle()

  // Get site (with access check)
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1)

  if (!site) {
    throw createError({ statusCode: 404, message: 'Site not found' })
  }

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

  if (!site.githubRepoUrl) {
    return []
  }

  const schemas = await listCmsSchemas(site.githubRepoUrl, site.githubBranch)
  return schemas
})
