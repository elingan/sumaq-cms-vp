import { requireAdminRole } from '#server/utils/auth'
import { getGitHubInstallationDetails, saveUserGitHubConnection } from '#server/utils/github'
import { z } from 'zod'

const CallbackQuerySchema = z.object({
  installation_id: z.string().regex(/^\d+$/),
  setup_action: z.string().optional(),
  state: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const { userId } = await requireAdminRole(event)

  const query = getQuery(event)
  const parsed = CallbackQuerySchema.safeParse(query)

  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid callback query' })
  }

  const expectedState = getCookie(event, 'github_app_state')
  if (!expectedState || expectedState !== parsed.data.state) {
    throw createError({ statusCode: 400, message: 'Invalid GitHub connect state' })
  }

  deleteCookie(event, 'github_app_state', { path: '/' })

  const installationId = Number.parseInt(parsed.data.installation_id, 10)
  const details = await getGitHubInstallationDetails(installationId)

  await saveUserGitHubConnection(userId, {
    installationId,
    accountLogin: details.accountLogin,
    accountType: details.accountType,
  })

  await createAuditLog(
    userId,
    'github_app_connected',
    {
      targetType: 'github_app',
      targetId: String(installationId),
      setupAction: parsed.data.setup_action ?? null,
    },
    event,
  )

  return sendRedirect(event, '/dashboard?github=connected', 302)
})
