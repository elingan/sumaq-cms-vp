import { requireUserSession } from '#server/utils/auth'
export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  if (session.user.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const state = createGitHubConnectState()

  setCookie(event, 'github_app_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60,
  })

  await createAuditLog(
    session.user.id,
    'github_app_connect_start',
    { targetType: 'github_app' },
    event,
  )

  return sendRedirect(event, getGitHubInstallUrl(state), 302)
})
