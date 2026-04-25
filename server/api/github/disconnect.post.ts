import { requireAdminRole } from '#server/utils/auth'
import { getUserGitHubConnection, clearUserGitHubConnection } from '#server/utils/github'

export default defineEventHandler(async (event) => {
  const { userId } = await requireAdminRole(event)

  const connection = await getUserGitHubConnection(userId)

  await clearUserGitHubConnection(userId)

  await createAuditLog(
    userId,
    'github_app_disconnected',
    {
      targetType: 'github_app',
      targetId: connection?.installationId ? String(connection.installationId) : null,
    },
    event,
  )

  return { success: true }
})
