import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { sites, siteUsers } from '#server/db/schema'

const PatchSiteSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  language: z.string().optional(),
  template: z.string().optional(),
  githubRepoUrl: z.string().url().optional().or(z.literal('')),
  githubBranch: z.string().optional(),
  domain: z.string().optional(),
  siteUrl: z.string().url().optional().or(z.literal('')),
  vercelProjectId: z.string().optional(),
  vercelUrl: z.string().optional(),
  screenshotUrl: z.string().url().optional().or(z.literal('')),
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing site id' })
  }

  // Require owner+ role
  if (session.user.role === 'editor') {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const db = useDrizzle()

  // Verify access
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

  const body = await readBody(event)
  const result = PatchSiteSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.issues[0]?.message ?? 'Invalid input',
    })
  }

  const [updated] = await db
    .update(sites)
    .set({ ...result.data, updatedAt: new Date() })
    .where(eq(sites.id, id))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Site not found' })
  }

  await createAuditLog(session.user.id, 'update_site', { targetType: 'site', targetId: id }, event)

  return updated
})
