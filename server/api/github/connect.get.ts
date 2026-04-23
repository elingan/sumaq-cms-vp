import { requireAdminRole } from '#server/utils/auth'

export default defineEventHandler(async (event) => {
  const { userId } = await requireAdminRole(event)

  const state = createGitHubConnectState()

  setCookie(event, 'github_app_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60,
  })

  await createAuditLog(userId, 'github_app_connect_start', { targetType: 'github_app' }, event)

  return sendRedirect(event, getGitHubInstallUrl(state), 302)
})
