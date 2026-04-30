import { requirePermission } from '#server/utils/permissions'
import { listAllUsers } from '#server/utils/clerk-users'
import { getClerkUser } from '#server/utils/auth'

export default defineEventHandler(async (event) => {
  // Get authenticated user
  const userId = await getClerkUser(event)

  // Check permission using centralized evaluator
  await requirePermission(userId, 'admin', 'list_users')

  return await listAllUsers(event)
})
