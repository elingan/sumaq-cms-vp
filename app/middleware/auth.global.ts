import { useAuth, useUser } from '#imports'

export default defineNuxtRouteMiddleware((to) => {
  const { isSignedIn, isLoaded } = useAuth()
  const { user, isLoaded: isUserLoaded } = useUser()

  // Wait for Clerk to load before checking auth state
  if (!isLoaded.value || !isUserLoaded.value) {
    return
  }

  const protectedPrefixes = [
    '/dashboard',
    '/site',
    '/admin',
    '/settings',
    '/profile',
    '/billing',
    '/calendar',
    '/appointment',
    '/booking',
    '/bookings',
  ]
  const isProtected = protectedPrefixes.some((prefix) => to.path.startsWith(prefix))

  if (isProtected && !isSignedIn.value) {
    return navigateTo('/login')
  }

  if (isProtected && isSignedIn.value) {
    const role = user.value?.publicMetadata?.role as string | undefined
    const isAdmin = role === 'admin'

    if (!isAdmin && !to.path.startsWith('/dashboard')) {
      return navigateTo('/dashboard')
    }
  }
})
