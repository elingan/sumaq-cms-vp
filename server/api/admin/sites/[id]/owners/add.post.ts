import { z } from 'zod'
import { siteUsers } from '#server/db/schema'
import { requireAdminRole } from '#server/utils/auth'
import { createAuditLog } from '#server/utils/audit'
import { and, eq } from 'drizzle-orm'

const AddOwnerSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['owner', 'editor', 'partner']).default('owner'),
})

export default defineEventHandler(async (event) => {
  const { userId: adminId } = await requireAdminRole(event)

  const siteId = getRouterParam(event, 'id')
  if (!siteId) {
    throw createError({ statusCode: 400, message: 'Missing site id' })
  }

  const body = await readBody(event)
  const result = AddOwnerSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.issues[0]?.message ?? 'Invalid input',
    })
  }

  const db = useDrizzle()

  // Check if user is already a member
  const [existing] = await db
    .select()
    .from(siteUsers)
    .where(and(eq(siteUsers.siteId, siteId), eq(siteUsers.userId, result.data.userId)))
    .limit(1)

  if (existing) {
    throw createError({
      statusCode: 409,
      message: 'User is already a member of this site',
    })
  }

  // Add user to site
  const [membership] = await db
    .insert(siteUsers)
    .values({
      siteId,
      userId: result.data.userId,
      role: result.data.role,
    })
    .returning()

  await createAuditLog(
    adminId,
    'add_site_member',
    {
      targetType: 'site_membership',
      targetId: `${siteId}:${result.data.userId}`,
      siteId,
      userId: result.data.userId,
      role: result.data.role,
    },
    event,
  )

  return membership
})
