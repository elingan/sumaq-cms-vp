/**
 * @deprecated Logout is now handled by Clerk
 * Use the Clerk signOut() composable from useClerk()
 */
export default defineEventHandler(async () => {
  throw createError({
    statusCode: 410, // Gone
    message: 'Logout is now handled by Clerk. Use the signOut() composable.',
  })
})
