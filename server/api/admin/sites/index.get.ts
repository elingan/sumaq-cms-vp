import { sites, siteUsers } from '#server/db/schema'
import { requireAdminRole } from '#server/utils/auth'
import { sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireAdminRole(event)

  const db = useDrizzle()

  // Get all sites with their owners
  const result = await db
    .select({
      id: sites.id,
      name: sites.name,
      slug: sites.slug,
      description: sites.description,
      createdAt: sites.createdAt,
      ownerCount: sql<number>`COUNT(DISTINCT CASE WHEN ${siteUsers.role} = 'owner' THEN ${siteUsers.userId} END)`,
    })
    .from(sites)
    .leftJoin(siteUsers, sql`${siteUsers.siteId} = ${sites.id}`)
    .groupBy(sites.id)
    .orderBy(sites.createdAt)

  return result
})
