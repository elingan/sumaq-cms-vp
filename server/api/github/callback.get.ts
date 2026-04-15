import { z } from 'zod'

const CallbackQuerySchema = z.object({
  installation_id: z.string().regex(/^\d+$/),
  setup_action: z.string().optional(),
  state: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  if (session.user.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

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

  await saveGlobalGitHubConnection(session.user.id, {
    installationId,
    accountLogin: details.accountLogin,
    accountType: details.accountType,
  })

  await createAuditLog(
    session.user.id,
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
