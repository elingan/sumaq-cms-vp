import { useAuth, useUser } from '#imports'

export default defineNuxtRouteMiddleware(async (to) => {
  const { isSignedIn, isLoaded } = useAuth()
  const { user, isLoaded: isUserLoaded } = useUser()

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

  if (!isProtected) return

  if (import.meta.server) {
    return
  }

  if (!isLoaded.value || !isUserLoaded.value) {
    await new Promise<void>((resolve) => {
      if (isLoaded.value && isUserLoaded.value) {
        resolve()
        return
      }

      let resolved = false
      const stop = watch([isLoaded, isUserLoaded], ([authLoaded, userLoaded]) => {
        if (resolved) return
        if (authLoaded && userLoaded) {
          resolved = true
          stop()
          resolve()
        }
      })

      setTimeout(() => {
        if (resolved) return
        resolved = true
        stop()
        resolve()
      }, 8000)
    })
  }

  if (!isLoaded.value || !isUserLoaded.value) {
    return
  }

  if (!isSignedIn.value) {
    return navigateTo('/auth/login')
  }

  const role = user.value?.publicMetadata?.role as string | undefined
  const isAdmin = role === 'admin'

  if (!isAdmin && !to.path.startsWith('/dashboard')) {
    return navigateTo('/dashboard')
  }
})
