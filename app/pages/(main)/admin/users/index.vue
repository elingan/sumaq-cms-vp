<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { UserRole } from '#shared/types/user'

definePageMeta({ layout: 'dashboard', title: 'Users' })

const { t } = useI18n()
const toast = useToast()

interface UserRow {
  id: string
  email: string
  name: string | null
  role: UserRole
  hasPassword: boolean
  createdAt: string
}

interface UserFormResult {
  user: {
    id: string
    email: string
    name: string | null
    role: UserRole
  }
  passwordSetupLink?: string
  passwordSetupExpiresAt?: string
}

const { data: users, refresh } = await useFetch<UserRow[]>('/api/admin/users')

const showCreateModal = ref(false)
const editingUser = ref<UserRow | null>(null)
const isSyncing = ref(false)
const generatedLink = ref<{
  userId: string
  link: string
  purpose: string
  expiresAt: string
} | null>(null)

const columns = computed<TableColumn<UserRow>[]>(() => [
  { accessorKey: 'email', header: t('auth.email') },
  { accessorKey: 'name', header: t('users.name') },
  { accessorKey: 'role', header: t('users.role') },
  { id: 'status', header: t('users.status') },
  { accessorKey: 'createdAt', header: t('sites.updated') },
  { id: 'actions', header: '' },
])

function handleFormOpen(value: boolean) {
  if (!value) {
    showCreateModal.value = false
    editingUser.value = null
  }
}

function openCreateModal() {
  editingUser.value = null
  showCreateModal.value = true
}

async function handleUserSaved(result: UserFormResult) {
  await refresh()

  if (result.passwordSetupLink) {
    generatedLink.value = {
      userId: result.user.id,
      link: result.passwordSetupLink,
      purpose: 'invite',
      expiresAt: result.passwordSetupExpiresAt ?? '',
    }

    toast.add({
      title: t('users.linkGenerated'),
      color: 'success',
      icon: 'i-lucide-link',
    })
  }
}

async function copyGeneratedLink() {
  if (!generatedLink.value) return

  await navigator.clipboard.writeText(generatedLink.value.link)
  toast.add({
    title: t('users.linkCopied'),
    color: 'success',
    icon: 'i-lucide-copy',
  })
}

async function regeneratePasswordLink(row: UserRow) {
  const result = await $fetch<{ passwordLink: string; expiresAt: string; purpose: string }>(
    `/api/admin/users/${row.id}/password-link`,
    {
      method: 'POST',
    },
  )

  generatedLink.value = {
    userId: row.id,
    link: result.passwordLink,
    purpose: result.purpose,
    expiresAt: result.expiresAt,
  }

  toast.add({
    title: t('users.linkGenerated'),
    color: 'success',
    icon: 'i-lucide-link',
  })
}

async function deleteUser(id: string) {
  if (!confirm(t('users.confirmDelete'))) return
  await $fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
  await refresh()
}

async function syncUsers() {
  isSyncing.value = true
  try {
    const result = await $fetch<{ success: boolean; syncedCount: number; errorCount: number }>(
      '/api/admin/users/sync',
      { method: 'POST' },
    )
    toast.add({
      title: 'Sincronización Exitosa',
      description: `Usuarios sincronizados: ${result.syncedCount}. Errores: ${result.errorCount}`,
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    await refresh()
  } catch (error) {
    toast.add({
      title: 'Error de Sincronización',
      description: 'Ocurrió un error al sincronizar con Clerk.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    isSyncing.value = false
  }
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
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="soft"
            :loading="isSyncing"
            label="Sincronizar Usuarios"
            @click="syncUsers"
          />
          <UButton icon="i-lucide-plus" :label="t('users.createUser')" @click="openCreateModal" />
        </template>
      </UDashboardNavbar>
    </template>

    <div class="p-6">
      <div v-if="generatedLink" class="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="text-sm font-medium text-highlighted">
              {{
                generatedLink.purpose === 'invite'
                  ? t('users.setupLinkLabel')
                  : t('users.resetLinkLabel')
              }}
            </p>
            <p class="text-sm text-muted">
              {{
                t('users.linkExpiresAt', {
                  date: new Date(generatedLink.expiresAt).toLocaleString(),
                })
              }}
            </p>
          </div>

          <UButton color="neutral" variant="soft" icon="i-lucide-copy" @click="copyGeneratedLink">
            {{ t('users.copyLink') }}
          </UButton>
        </div>

        <UInput :model-value="generatedLink.link" readonly class="mt-3 w-full" />
      </div>

      <UTable :data="users ?? []" :columns="columns">
        <template #role-data="{ row }">
          <UBadge variant="subtle" color="neutral">
            {{ row.original.role }}
          </UBadge>
        </template>

        <template #status-data="{ row }">
          <UBadge :color="row.original.hasPassword ? 'success' : 'warning'" variant="subtle">
            {{ row.original.hasPassword ? t('users.statusActive') : t('users.statusPendingSetup') }}
          </UBadge>
        </template>

        <template #createdAt-data="{ row }">
          {{ new Date(row.original.createdAt).toLocaleDateString() }}
        </template>

        <template #actions-data="{ row }">
          <div class="flex gap-1 justify-end">
            <UButton
              icon="i-lucide-link"
              size="xs"
              color="primary"
              variant="ghost"
              @click="regeneratePasswordLink(row.original)"
            />
            <UButton
              icon="i-lucide-pencil"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="editingUser = row.original"
            />
            <UButton
              icon="i-lucide-trash-2"
              size="xs"
              color="error"
              variant="ghost"
              @click="deleteUser(row.original.id)"
            />
          </div>
        </template>
      </UTable>
    </div>

    <AdminUserForm
      :open="showCreateModal || !!editingUser"
      :user="editingUser"
      @update:open="handleFormOpen"
      @saved="handleUserSaved"
    />
  </UDashboardPanel>
</template>
