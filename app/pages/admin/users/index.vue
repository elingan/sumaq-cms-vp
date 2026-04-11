<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: 'Users' })

const { t } = useI18n()

const { data: users, refresh } = await useFetch('/api/admin/users')

const showCreateModal = ref(false)
const editingUser = ref<{ id: string; name: string | null; role: string } | null>(null)

const columns = computed(() => [
  { key: 'email', label: t('auth.email') },
  { key: 'name', label: 'Name' },
  { key: 'role', label: 'Role' },
  { key: 'createdAt', label: t('sites.updated') },
  { key: 'actions', label: '' },
])

async function deleteUser(id: string) {
  if (!confirm(t('users.confirmDelete'))) return
  await $fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Users">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            icon="i-lucide-plus"
            :label="t('users.createUser')"
            @click="showCreateModal = true"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <div class="p-6">
      <UTable :rows="users ?? []" :columns="columns">
        <template #role-data="{ row }">
          <UBadge variant="subtle" color="neutral">
            {{ row.role }}
          </UBadge>
        </template>

        <template #createdAt-data="{ row }">
          {{ new Date(row.createdAt).toLocaleDateString() }}
        </template>

        <template #actions-data="{ row }">
          <div class="flex gap-1 justify-end">
            <UButton
              icon="i-lucide-pencil"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="editingUser = row"
            />
            <UButton
              icon="i-lucide-trash-2"
              size="xs"
              color="error"
              variant="ghost"
              @click="deleteUser(row.id)"
            />
          </div>
        </template>
      </UTable>
    </div>
  </UDashboardPanel>
</template>
