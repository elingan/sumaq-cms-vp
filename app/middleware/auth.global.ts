import { useAuth } from '#imports'

export default defineNuxtRouteMiddleware((to) => {
  const { isSignedIn, isLoaded } = useAuth()

  // Wait for Clerk to load before checking auth state
  if (!isLoaded.value) {
    return
  }

  const protectedPrefixes = [
    '/dashboard',
    '/site',
    '/admin',
    '/settings',
    '/profile',
    '/billing',
    '/booking',
    '/bookings',
    '/onboarding',
  ]
  const isProtected = protectedPrefixes.some((prefix) => to.path.startsWith(prefix))

  if (isProtected && !isSignedIn.value) {
    return navigateTo('/login')
  }
})
