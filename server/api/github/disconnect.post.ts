export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  if (session.user.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const connection = await getGlobalGitHubConnection()

  await clearGlobalGitHubConnection()

  await createAuditLog(
    session.user.id,
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
