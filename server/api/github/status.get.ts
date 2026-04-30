import { getClerkUser } from '#server/utils/auth'
import { requirePermission } from '#server/utils/permissions'
import { getUserGitHubConnection } from '#server/utils/github'

export default defineEventHandler(async (event) => {
  const userId = await getClerkUser(event)
  await requirePermission(userId, 'admin', 'view_github_status')

  const connection = await getUserGitHubConnection(userId)

  return {
    connected: !!connection,
    installationId: connection?.installationId ?? null,
    accountLogin: connection?.accountLogin ?? null,
    accountType: connection?.accountType ?? null,
  }
})
