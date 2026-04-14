import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { pages, siteUsers } from '#server/db/schema'

const CreatePageSchema = z.object({
  name: z.string().min(1).max(255),
  title: z.string().optional(),
  type: z.string().default('page'),
  status: z.enum(['draft', 'published']).default('draft'),
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const siteId = getRouterParam(event, 'siteId')

  if (!siteId) {
    throw createError({ statusCode: 400, message: 'Missing siteId' })
  }

  const db = useDrizzle()

  // Non-admins must be an owner or editor of the site
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

  const body = await readBody(event)
  const data = CreatePageSchema.parse(body)

  const [page] = await db
    .insert(pages)
    .values({
      siteId,
      name: data.name,
      title: data.title,
      type: data.type,
      status: data.status,
    })
    .returning()

  await createAuditLog(session.user.id, 'create_page', { siteId, pageId: page!.id }, event)

  return page
})
