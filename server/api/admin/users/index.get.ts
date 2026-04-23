import { requireAdminRole } from '#server/utils/auth'
import { listAllUsers } from '#server/utils/clerk-users'

export default defineEventHandler(async (event) => {
  await requireAdminRole(event)

  return await listAllUsers(event)
})
