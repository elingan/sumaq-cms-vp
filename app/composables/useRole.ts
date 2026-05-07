import { useUser } from '#imports'

/**
 * Provides reactive role flags derived from Clerk public metadata.
 *
 * Global role flags (isAdmin, isOwner, etc.) come from Clerk publicMetadata.role.
 * For fine-grained capability checks (per site, per module), use the
 * capabilities endpoint: GET /api/auth/capabilities?module=cms&siteId=...
 */
export function useRole() {
  const { user } = useUser()

  const role = computed<'admin' | 'user'>(() => {
    const clerkRole = user.value?.publicMetadata?.role as string | undefined
    return clerkRole === 'admin' ? 'admin' : 'user'
  })

  const isAdmin = computed(() => role.value === 'admin')
  const isOwner = computed(() => false)
  const isEditor = computed(() => false)
  const isPartner = computed(() => false)

  // Admin-only capabilities
  const canCreateSites = computed(() => isAdmin.value)
  const canManageSites = computed(() => isAdmin.value)
  const canCreateBookings = computed(() => isAdmin.value)
  const canManageLocations = computed(() => isAdmin.value)
  const canManageRooms = computed(() => isAdmin.value)
  const canManageTeams = computed(() => isAdmin.value)
  const canManageMembers = computed(() => isAdmin.value)
  const canSyncUsers = computed(() => isAdmin.value)

  return {
    role,
    isAdmin,
    isOwner,
    isEditor,
    isPartner,
    canCreateSites,
    canManageSites,
    canCreateBookings,
    canManageLocations,
    canManageRooms,
    canManageTeams,
    canManageMembers,
    canSyncUsers,
  }
}

/**
 * Fetch server-side capabilities for a given module and context.
 * Use this when you need authoritative permission checks (e.g. CMS site roles).
 *
 * @example
 * const { capabilities } = await useCapabilities('cms', { siteId: '...' })
 * if (capabilities.value?.edit_site) { ... }
 */
export async function useCapabilities(
  module: 'cms' | 'calendar' | 'appointments' | 'admin',
  context: { siteId?: string; locationId?: string; roomId?: string } = {},
) {
  const query = { module, ...context }
  const { data: capabilities, refresh } = await useFetch('/api/auth/capabilities', { query })
  return { capabilities: computed(() => capabilities.value?.capabilities ?? null), refresh }
}
