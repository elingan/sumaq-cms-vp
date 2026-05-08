/**
 * @deprecated Login is now handled by Clerk
 * Use the Clerk SignIn component in app/pages/auth/login.vue
 */
export default defineEventHandler(async () => {
  throw createError({
    statusCode: 410, // Gone
    message: 'Login via email/password is now handled by Clerk. Use the SignIn component.',
  })
})
