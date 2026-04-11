export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  return session.user
})
