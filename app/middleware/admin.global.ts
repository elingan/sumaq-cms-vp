export default defineNuxtRouteMiddleware((to) => {
  const { user } = useUserSession()

  if (to.path.startsWith('/admin') && user.value?.role !== 'admin') {
    return navigateTo('/dashboard')
  }
})
