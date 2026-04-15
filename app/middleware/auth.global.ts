export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()

  if (to.path === '/') {
    return navigateTo(loggedIn.value ? '/dashboard' : '/login')
  }

  const protectedPrefixes = ['/dashboard', '/site', '/admin', '/settings', '/profile']
  const isProtected = protectedPrefixes.some((prefix) => to.path.startsWith(prefix))

  if (isProtected && !loggedIn.value) {
    return navigateTo('/login')
  }
})
