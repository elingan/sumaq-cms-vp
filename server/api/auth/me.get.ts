import { requireUserSession } from '#server/utils/auth'
export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  return session.user
})
