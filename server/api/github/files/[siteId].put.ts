import { getClerkUserWithData } from '#server/utils/auth'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { sites, siteUsers } from '#server/db/schema'

const PushFileSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  commitMessage: z.string().default('chore: update content via Sumaq CMS'),
})

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

    if (!membership.length || membership[0]!.role === 'partner') {
      throw createError({ statusCode: 403, message: 'Forbidden' })
    }
  }

  if (!site.githubRepoUrl) {
    throw createError({ statusCode: 409, message: 'Site has no GitHub repository configured' })
  }

  const body = await readBody(event)
  const data = PushFileSchema.parse(body)

  await updateRepoFile(
    site.githubRepoUrl,
    site.githubBranch,
    data.path,
    data.content,
    data.commitMessage,
    userId,
  )

  await createAuditLog(userId, 'push_github_file', { siteId, path: data.path }, event)

  return { success: true }
})
