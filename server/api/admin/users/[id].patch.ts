import { z } from 'zod'
import { requirePermission } from '#server/utils/permissions'
import { getClerkUser } from '#server/utils/auth'
import { updateClerkUserMetadata } from '#server/utils/clerk-users'
import { createAuditLog, auditUserRoleChange } from '#server/utils/audit'

const PatchUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['admin', 'user']).optional(),
})

export default defineEventHandler(async (event) => {
  const userId = await getClerkUser(event)

  // Check permission using centralized evaluator
  await requirePermission(userId, 'admin', 'update_user')

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing user id' })
  }

  const body = await readBody(event)
  const result = PatchUserSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.issues[0]?.message ?? 'Invalid input',
    })
  }

  // If role is being changed, audit it specifically
  if (result.data.role) {
    // Note: This audits via local DB; Clerk change is captured by webhook
    // We're recording the admin-initiated request here
    await auditUserRoleChange(id, undefined, result.data.role, 'admin_api')
  }

  // Update user in Clerk
  const updated = await updateClerkUserMetadata(event, id, {
    firstName: result.data.firstName,
    lastName: result.data.lastName,
    role: result.data.role,
  })

  await createAuditLog(
    userId,
    'update_user',
    {
      targetType: 'user',
      targetId: id,
      changes: result.data,
    },
    event,
  )

  return updated
})
