import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { sites, siteUsers } from '#server/db/schema'
import { validateRepositoryAccess } from '#server/utils/github'
import { getClerkUserWithData } from '#server/utils/auth'

const CreateSiteSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
  description: z.string().optional(),
  language: z.string().default('en'),
  template: z.string().default('blank'),
  githubRepoUrl: z.string().url().optional().or(z.literal('')),
  githubBranch: z.string().default('main'),
  domain: z.string().optional(),
  siteUrl: z.string().url().optional().or(z.literal('')),
})

export default defineEventHandler(async (event) => {
  const user = await getClerkUserWithData(event)

  if (user.role !== 'admin' && user.role !== 'owner') {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const body = await readBody(event)
  const result = CreateSiteSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.issues[0]?.message ?? 'Invalid input',
    })
  }

  const db = useDrizzle()

  // Check slug uniqueness
  const [existing] = await db
    .select({ id: sites.id })
    .from(sites)
    .where(eq(sites.slug, result.data.slug))
    .limit(1)

  if (existing) {
    throw createError({ statusCode: 409, message: 'Slug already in use' })
  }

  let githubRepoUrl: string | null = result.data.githubRepoUrl || null
  let githubBranch = result.data.githubBranch

  if (githubRepoUrl) {
    const repo = await validateRepositoryAccess(githubRepoUrl)
    githubRepoUrl = repo.url
    githubBranch = githubBranch || repo.defaultBranch
  }

  const [site] = await db
    .insert(sites)
    .values({
      ...result.data,
      githubRepoUrl,
      githubBranch,
      siteUrl: result.data.siteUrl || null,
    })
    .returning()

  // Associate the creating user as owner
  await db.insert(siteUsers).values({
    siteId: site!.id,
    userId: user.userId,
    role: 'owner',
  })

  await createAuditLog(
    user.userId,
    'create_site',
    { targetType: 'site', targetId: site!.id },
    event,
  )

  return site
})
