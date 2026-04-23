export default defineEventHandler(async () => {
  throw createError({
    statusCode: 410, // Gone
    message: 'Password reset is now managed by Clerk.',
  })
})
