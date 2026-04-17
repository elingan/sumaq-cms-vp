import type { H3Event } from 'h3'
import { and, eq, type InferSelectModel } from 'drizzle-orm'
import { sites, siteUsers } from '#server/db/schema'

type SiteRecord = InferSelectModel<typeof sites>

async function assertSiteAccess(event: H3Event, siteId: string) {
  const session = await requireUserSession(event)

  if (session.user.role === 'admin') {
    return
  }

  const db = useDrizzle()
  const [membership] = await db
    .select()
    .from(siteUsers)
    .where(and(eq(siteUsers.siteId, siteId), eq(siteUsers.userId, session.user.id)))
    .limit(1)

  if (!membership) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }
}

async function assertSiteEditAccess(event: H3Event, siteId: string) {
  const session = await requireUserSession(event)

  if (session.user.role === 'admin') {
    return
  }

  const db = useDrizzle()
  const [membership] = await db
    .select({ role: siteUsers.role })
    .from(siteUsers)
    .where(and(eq(siteUsers.siteId, siteId), eq(siteUsers.userId, session.user.id)))
    .limit(1)

  if (!membership || membership.role === 'partner') {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }
}

export async function getAccessibleSiteById(event: H3Event, id: string): Promise<SiteRecord> {
  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing site id' })
  }

  const db = useDrizzle()
  const [site] = await db.select().from(sites).where(eq(sites.id, id)).limit(1)

  if (!site) {
    throw createError({ statusCode: 404, message: 'Site not found' })
  }

  await assertSiteAccess(event, site.id)

  return site
}

export async function getAccessibleSiteBySlug(event: H3Event, slug: string): Promise<SiteRecord> {
  if (!slug) {
    throw createError({ statusCode: 400, message: 'Missing site slug' })
  }

  const db = useDrizzle()
  const [site] = await db.select().from(sites).where(eq(sites.slug, slug)).limit(1)

  if (!site) {
    throw createError({ statusCode: 404, message: 'Site not found' })
  }

  await assertSiteAccess(event, site.id)

  return site
}

export async function getEditableSiteById(event: H3Event, id: string): Promise<SiteRecord> {
  const site = await getAccessibleSiteById(event, id)
  await assertSiteEditAccess(event, site.id)
  return site
}

export async function getEditableSiteBySlug(event: H3Event, slug: string): Promise<SiteRecord> {
  const site = await getAccessibleSiteBySlug(event, slug)
  await assertSiteEditAccess(event, site.id)
  return site
}
