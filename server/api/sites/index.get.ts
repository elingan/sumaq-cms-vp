import { eq, type InferSelectModel } from 'drizzle-orm'
import { sites, siteUsers } from '#server/db/schema'

type SiteRow = InferSelectModel<typeof sites>

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const db = useDrizzle()

  if (session.user.role === 'admin') {
    return db.select().from(sites).orderBy(sites.updatedAt)
  }

  // For non-admin users, return only sites they are associated with
  const rows = await db
    .select({ site: sites })
    .from(siteUsers)
    .innerJoin(sites, eq(sites.id, siteUsers.siteId))
    .where(eq(siteUsers.userId, session.user.id))
    .orderBy(sites.updatedAt)

  return rows.map((r: { site: SiteRow }) => r.site)
})
