<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Site Management</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage site owners and access levels
        </p>
      </div>
    </div>

    <!-- Sites Table -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Sites</h2>
        </div>
      </template>

      <div v-if="loading" class="flex items-center justify-center py-8">
        <UIcon name="i-lucide-loader-2" class="animate-spin" />
      </div>

      <UTable
        v-else
        :rows="sites"
        :columns="siteColumns"
        :ui="{ td: { base: 'whitespace-nowrap' } }"
      >
        <template #name-data="{ row }">
          <div class="space-y-1">
            <p class="font-medium">{{ row.name }}</p>
            <p class="text-sm text-gray-500">{{ row.slug }}</p>
          </div>
        </template>

        <template #ownerCount-data="{ row }">
          <UBadge>{{ row.ownerCount }} owner(s)</UBadge>
        </template>

        <template #actions-data="{ row }">
          <UButton size="sm" color="primary" variant="ghost" @click="openOwnerModal(row)">
            Manage Owners
          </UButton>
        </template>
      </UTable>
    </UCard>

    <!-- Owner Management Modal -->
    <UModal
      v-model="showOwnerModal"
      title="Manage Site Owners"
      :ui="{ width: 'w-full sm:max-w-lg' }"
    >
      <div v-if="selectedSite" class="space-y-4">
        <!-- Site Info -->
        <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
          <h3 class="font-medium">{{ selectedSite.name }}</h3>
          <p class="text-sm text-gray-500">{{ selectedSite.slug }}</p>
        </div>

        <!-- Current Owners List -->
        <div class="space-y-2">
          <h4 class="font-medium text-sm">Current Members</h4>
          <div v-if="loadingOwners" class="flex items-center justify-center py-4">
            <UIcon name="i-lucide-loader-2" class="animate-spin" />
          </div>
          <div v-else-if="siteOwners.length === 0" class="text-sm text-gray-500">
            No members assigned yet
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="owner in siteOwners"
              :key="owner.id"
              class="flex items-center justify-between rounded-lg bg-gray-50 p-2 dark:bg-gray-900"
            >
              <div>
                <p class="text-sm font-medium">{{ owner.email }}</p>
                <UBadge size="xs" color="blue">{{ owner.role }}</UBadge>
              </div>
              <UDropdown :items="getRoleMenuItems(owner)">
                <UButton color="gray" variant="ghost" icon="i-lucide-more-horizontal" size="xs" />
              </UDropdown>
            </div>
          </div>
        </div>

        <!-- Add Owner Section -->
        <div class="space-y-2 border-t pt-4">
          <h4 class="font-medium text-sm">Add Member</h4>
          <div class="flex gap-2">
            <USelectMenu
              v-model="selectedUserForAdd"
              placeholder="Select user..."
              searchable
              :options="availableUsers"
              option-attribute="email"
              :ui="{ base: 'flex-1' }"
              @search="searchUsers"
            >
              <template #label>
                <span v-if="selectedUserForAdd">{{ selectedUserForAdd.email }}</span>
                <span v-else class="text-gray-500">Choose a user...</span>
              </template>
            </USelectMenu>
            <UButton :loading="addingOwner" @click="addOwner"> Add </UButton>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="gray" @click="showOwnerModal = false">Close</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Site {
  id: string
  name: string
  slug: string
  description: string | null
  createdAt: string
  ownerCount: number
}

interface SiteOwner {
  id: string
  email: string
  name: string | null
  role: string
  joinedAt: string
}

interface ClerkUser {
  id: string
  email: string
}

const loading = ref(true)
const loadingOwners = ref(false)
const addingOwner = ref(false)

const sites = ref<Site[]>([])
const selectedSite = ref<Site | null>(null)
const siteOwners = ref<SiteOwner[]>([])
const showOwnerModal = ref(false)
const selectedUserForAdd = ref<ClerkUser | null>(null)
const availableUsers = ref<ClerkUser[]>([])

const siteColumns = [
  { key: 'name', label: 'Site' },
  { key: 'ownerCount', label: 'Owners' },
  { key: 'createdAt', label: 'Created' },
  { key: 'actions', label: 'Actions' },
]

// Load sites on mount
onMounted(() => {
  loadSites()
})

async function loadSites() {
  loading.value = true
  try {
    const { data } = await useFetch('/api/admin/sites')
    sites.value = data.value || []
  } catch (error) {
    console.error('Failed to load sites:', error)
    useToast().add({
      title: 'Error',
      description: 'Failed to load sites',
      color: 'red',
    })
  } finally {
    loading.value = false
  }
}

async function openOwnerModal(site: Site) {
  selectedSite.value = site
  showOwnerModal.value = true
  siteOwners.value = []
  selectedUserForAdd.value = null

  loadingOwners.value = true
  try {
    const { data } = await useFetch(`/api/admin/sites/${site.id}/owners`)
    siteOwners.value = data.value || []
  } catch (error) {
    console.error('Failed to load owners:', error)
    useToast().add({
      title: 'Error',
      description: 'Failed to load site owners',
      color: 'red',
    })
  } finally {
    loadingOwners.value = false
  }

  // Load available users (all Clerk users)
  try {
    const { data } = await useFetch('/api/admin/users')
    const currentOwnerIds = new Set(siteOwners.value.map((o) => o.id))
    availableUsers.value = data.value?.filter((u: ClerkUser) => !currentOwnerIds.has(u.id)) || []
  } catch (error) {
    console.error('Failed to load users:', error)
  }
}

function getRoleMenuItems(owner: SiteOwner) {
  const roles = ['owner', 'editor', 'partner'].filter((r) => r !== owner.role)
  return [
    ...roles.map((role) => ({
      label: `Change to ${role}`,
      icon: 'i-lucide-edit',
      click: () => updateRole(owner.id, role),
    })),
    { label: 'Remove', icon: 'i-lucide-trash', click: () => removeOwner(owner.id), color: 'red' },
  ]
}

async function searchUsers(q: string) {
  // In a real app, this would filter the users list
  // For now, just use the already-loaded list
}

async function addOwner() {
  if (!selectedSite.value || !selectedUserForAdd.value) return

  addingOwner.value = true
  try {
    await $fetch(`/api/admin/sites/${selectedSite.value.id}/owners/add`, {
      method: 'POST',
      body: {
        userId: selectedUserForAdd.value.id,
        role: 'owner',
      },
    })

    useToast().add({
      title: 'Success',
      description: 'Owner added successfully',
      color: 'green',
    })

    // Reload owners and available users
    const site = selectedSite.value
    await openOwnerModal(site)
  } catch (error) {
    console.error('Failed to add owner:', error)
    useToast().add({
      title: 'Error',
      description: 'Failed to add owner',
      color: 'red',
    })
  } finally {
    addingOwner.value = false
  }
}

async function removeOwner(userId: string) {
  if (!selectedSite.value) return

  try {
    await $fetch(`/api/admin/sites/${selectedSite.value.id}/owners/remove`, {
      method: 'POST',
      body: { userId },
    })

    useToast().add({
      title: 'Success',
      description: 'Owner removed successfully',
      color: 'green',
    })

    const site = selectedSite.value
    await openOwnerModal(site)
  } catch (error) {
    console.error('Failed to remove owner:', error)
    useToast().add({
      title: 'Error',
      description: 'Failed to remove owner',
      color: 'red',
    })
  }
}

async function updateRole(userId: string, newRole: string) {
  if (!selectedSite.value) return

  try {
    await $fetch(`/api/admin/sites/${selectedSite.value.id}/owners/update-role`, {
      method: 'PATCH',
      body: {
        userId,
        role: newRole,
      },
    })

    useToast().add({
      title: 'Success',
      description: 'Role updated successfully',
      color: 'green',
    })

    const site = selectedSite.value
    await openOwnerModal(site)
  } catch (error) {
    console.error('Failed to update role:', error)
    useToast().add({
      title: 'Error',
      description: 'Failed to update role',
      color: 'red',
    })
  }
}
</script>
