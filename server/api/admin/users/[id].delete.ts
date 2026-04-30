import { requirePermission } from '#server/utils/permissions'
import { getClerkUser } from '#server/utils/auth'
import { deleteClerkUser, getClerkUserById } from '#server/utils/clerk-users'
import { createAuditLog } from '#server/utils/audit'

export default defineEventHandler(async (event) => {
  const userId = await getClerkUser(event)

  // Check permission using centralized evaluator
  await requirePermission(userId, 'admin', 'delete_user')

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing user id' })
  }

  // Prevent self-deletion
  if (id === userId) {
    throw createError({ statusCode: 400, message: 'Cannot delete your own account' })
  }

  // Get user to log their details
  const userToDelete = await getClerkUserById(event, id)

  // Delete from Clerk (IRREVERSIBLE)
  await deleteClerkUser(event, id)

  await createAuditLog(
    userId,
    'delete_user',
    {
      targetType: 'user',
      targetId: id,
      email: userToDelete.email,
      role: userToDelete.role,
    },
    event,
  )

  return { success: true, deletedUser: userToDelete }
})
