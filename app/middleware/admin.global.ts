import { useUser } from '#imports'

export default defineNuxtRouteMiddleware((to) => {
  const { user, isLoaded } = useUser()

  // Wait for Clerk to load
  if (!isLoaded.value) {
    return
  }

  const role = user.value?.publicMetadata?.role as string | undefined

  if (to.path.startsWith('/admin') && role !== 'admin') {
    return navigateTo('/dashboard')
  }
})
