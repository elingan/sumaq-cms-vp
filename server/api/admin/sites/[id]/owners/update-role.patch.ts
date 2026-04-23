import { z } from 'zod'
import { siteUsers } from '#server/db/schema'
import { requireAdminRole } from '#server/utils/auth'
import { createAuditLog } from '#server/utils/audit'
import { and, eq } from 'drizzle-orm'

const UpdateRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['owner', 'editor', 'partner']),
})

export default defineEventHandler(async (event) => {
  const { userId: adminId } = await requireAdminRole(event)

  const siteId = getRouterParam(event, 'id')
  if (!siteId) {
    throw createError({ statusCode: 400, message: 'Missing site id' })
  }

  const body = await readBody(event)
  const result = UpdateRoleSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.issues[0]?.message ?? 'Invalid input',
    })
  }

  const db = useDrizzle()

  // Get the current membership
  const [membership] = await db
    .select()
    .from(siteUsers)
    .where(and(eq(siteUsers.siteId, siteId), eq(siteUsers.userId, result.data.userId)))
    .limit(1)

  if (!membership) {
    throw createError({
      statusCode: 404,
      message: 'User is not a member of this site',
    })
  }

  // Update role
  const [updated] = await db
    .update(siteUsers)
    .set({ role: result.data.role })
    .where(and(eq(siteUsers.siteId, siteId), eq(siteUsers.userId, result.data.userId)))
    .returning()

  await createAuditLog(
    adminId,
    'update_site_member_role',
    {
      targetType: 'site_membership',
      targetId: `${siteId}:${result.data.userId}`,
      siteId,
      userId: result.data.userId,
      oldRole: membership.role,
      newRole: result.data.role,
    },
    event,
  )

  return updated
})
