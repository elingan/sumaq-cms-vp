import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { pages, siteUsers } from '~~/server/db/schema'

const UpdatePageSchema = z.object({
  title: z.string().optional(),
  contentJson: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(['draft', 'published']).optional(),
  schemaYaml: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const siteId = getRouterParam(event, 'siteId')
  const pageId = getRouterParam(event, 'pageId')

  if (!siteId || !pageId) {
    throw createError({ statusCode: 400, message: 'Missing siteId or pageId' })
  }

  const db = useDrizzle()

  // Non-admins must be an owner or editor
  if (session.user.role !== 'admin') {
    const membership = await db
      .select()
      .from(siteUsers)
      .where(and(eq(siteUsers.siteId, siteId), eq(siteUsers.userId, session.user.id)))
      .limit(1)

    if (!membership.length || membership[0]!.role === 'partner') {
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

  const body = await readBody(event)
  const data = UpdatePageSchema.parse(body)

  const publishedAt = data.status === 'published' ? new Date() : undefined

  const [updated] = await db
    .update(pages)
    .set({
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.contentJson !== undefined ? { contentJson: data.contentJson } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.schemaYaml !== undefined ? { schemaYaml: data.schemaYaml } : {}),
      ...(publishedAt ? { publishedAt } : {}),
      updatedAt: new Date(),
    })
    .where(eq(pages.id, pageId))
    .returning()

  await createAuditLog(session.user.id, 'update_page', { siteId, pageId }, event)

  return updated
})
