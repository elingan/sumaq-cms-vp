import { requireAdminRole } from '#server/utils/auth'
export default defineEventHandler(async (event) => {
  const { userId } = await requireAdminRole(event)

  const connection = await getGlobalGitHubConnection()

  await clearGlobalGitHubConnection()

  await createAuditLog(
    userId,
    'github_app_disconnected',
    {
      targetType: 'github_app',
      targetId: connection?.connection.installationId
        ? String(connection.connection.installationId)
        : null,
    },
    event,
  )

  return { success: true }
})
