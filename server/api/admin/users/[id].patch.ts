import { z } from 'zod'
import { requireAdminRole } from '#server/utils/auth'
import { updateClerkUserMetadata } from '#server/utils/clerk-users'
import { createAuditLog } from '#server/utils/audit'

const PatchUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['admin', 'partner', 'owner', 'editor']).optional(),
})

export default defineEventHandler(async (event) => {
  const { userId } = await requireAdminRole(event)

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
