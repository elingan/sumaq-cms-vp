export function useRole() {
  const { user } = useUserSession()
  const role = computed(() => user.value?.role)
  const isAdmin = computed(() => role.value === 'admin')
  const isOwner = computed(() => role.value === 'owner')
  const isEditor = computed(() => role.value === 'editor')
  const isPartner = computed(() => role.value === 'partner')
  const canCreateSites = computed(() => isAdmin.value)
  const canManageSites = computed(() => isAdmin.value || isOwner.value)

  return { role, isAdmin, isOwner, isEditor, isPartner, canManageSites, canCreateSites }
}
