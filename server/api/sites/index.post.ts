import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { sites, siteUsers } from '#server/db/schema'

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
  const session = await requireUserSession(event)

  if (session.user.role !== 'admin' && session.user.role !== 'owner') {
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

  const [site] = await db
    .insert(sites)
    .values({
      ...result.data,
      githubRepoUrl: result.data.githubRepoUrl || null,
      siteUrl: result.data.siteUrl || null,
    })
    .returning()

  // Associate the creating user as owner
  await db.insert(siteUsers).values({
    siteId: site!.id,
    userId: session.user.id,
    role: 'owner',
  })

  await createAuditLog(
    session.user.id,
    'create_site',
    { targetType: 'site', targetId: site!.id },
    event,
  )

  return site
})
