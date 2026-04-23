import { requireUserSession } from '#server/utils/auth'
export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  if (session.user.role !== 'admin' && session.user.role !== 'owner') {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const connection = await getGlobalGitHubConnection()

  return {
    connected: !!connection,
    installationId: connection?.connection.installationId ?? null,
    accountLogin: connection?.connection.accountLogin ?? null,
    accountType: connection?.connection.accountType ?? null,
  }
})
