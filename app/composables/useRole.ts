import { useUser } from '#imports'

export function useRole() {
  const { user } = useUser()

  const role = computed(() => {
    const clerkRole = user.value?.publicMetadata?.role as string | undefined
    return clerkRole || 'partner'
  })

  const isAdmin = computed(() => role.value === 'admin')
  const isOwner = computed(() => role.value === 'owner')
  const isEditor = computed(() => role.value === 'editor')
  const isPartner = computed(() => role.value === 'partner')
  const canCreateSites = computed(() => isAdmin.value)
  const canManageSites = computed(() => isAdmin.value || isOwner.value)

  return { role, isAdmin, isOwner, isEditor, isPartner, canManageSites, canCreateSites }
}
