import { requireAdminRole } from '#server/utils/auth'
import { getUserGitHubConnection } from '#server/utils/github'

export default defineEventHandler(async (event) => {
  const { userId } = await requireAdminRole(event)

  const connection = await getUserGitHubConnection(userId)

  return {
    connected: !!connection,
    installationId: connection?.installationId ?? null,
    accountLogin: connection?.accountLogin ?? null,
    accountType: connection?.accountType ?? null,
  }
})
