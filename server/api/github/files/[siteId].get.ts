import { getClerkUserWithData } from '#server/utils/auth'
import { eq, and } from 'drizzle-orm'
import { sites, siteUsers } from '#server/db/schema'

export default defineEventHandler(async (event) => {
  const { userId, role } = await getClerkUserWithData(event)
  const siteId = getRouterParam(event, 'siteId')

  if (!siteId) {
    throw createError({ statusCode: 400, message: 'Missing siteId' })
  }

  const db = useDrizzle()

  const [site] = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1)

  if (!site) {
    throw createError({ statusCode: 404, message: 'Site not found' })
  }

  if (role !== 'admin') {
    const membership = await db
      .select()
      .from(siteUsers)
      .where(and(eq(siteUsers.siteId, siteId), eq(siteUsers.userId, userId)))
      .limit(1)

    if (!membership.length) {
      throw createError({ statusCode: 403, message: 'Forbidden' })
    }
  }

  if (!site.githubRepoUrl) {
    return []
  }

  const schemas = await listCmsSchemas(site.githubRepoUrl, site.githubBranch, userId)
  return schemas
})
