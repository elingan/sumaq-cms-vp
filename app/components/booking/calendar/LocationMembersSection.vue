<template>
  <div :class="sectionClass">
    <div
      class="flex flex-col gap-3 lg:flex-row lg:items-end"
      :class="showHeader ? 'lg:justify-between' : 'lg:justify-end'"
    >
      <div v-if="showHeader">
        <h4 class="text-sm font-semibold text-highlighted">
          {{ $t('bookingCalendar.teamTitle') }}
        </h4>
        <p class="text-sm text-muted">
          {{ $t('bookingCalendar.teamDescription') }}
        </p>
      </div>

      <form class="flex flex-col gap-2 sm:flex-row sm:items-center" @submit.prevent="inviteMember">
        <UInput
          v-model="inviteForm.email"
          type="email"
          :placeholder="$t('bookingCalendar.inviteEmailPlaceholder')"
          class="min-w-0 sm:w-72"
        />
        <UButton
          type="submit"
          color="primary"
          icon="i-lucide-send"
          :loading="isInviting"
          :label="$t('bookingCalendar.sendInvitationButton')"
        />
      </form>
    </div>

    <div v-if="pending" class="flex justify-center py-6">
      <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-muted" />
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      :title="$t('bookingCalendar.teamLoadErrorTitle')"
      :description="error.data?.message ?? $t('bookingCalendar.teamLoadErrorDescription')"
    />

    <div
      v-else-if="visibleMembers.length === 0"
      class="rounded-lg border border-dashed border-default px-4 py-6 text-center"
    >
      <UIcon name="i-lucide-users" class="mx-auto mb-2 size-5 text-muted" />
      <p class="text-sm text-muted">
        {{ $t('bookingCalendar.noMembers') }}
      </p>
    </div>

    <UTable v-else :data="visibleMembers" :columns="columns">
      <template #name-data="{ row }">
        <span class="text-sm text-foreground">
          {{ row.original.name || $t('bookingCalendar.pendingMemberName') }}
        </span>
      </template>

      <template #status-data="{ row }">
        <UBadge :color="statusColor(row.original.status)" variant="subtle">
          {{ statusLabel(row.original.status) }}
        </UBadge>
      </template>

      <template #admin-data="{ row }">
        <div class="flex justify-center">
          <USwitch
            :model-value="row.original.role === 'admin'"
            :disabled="row.original.status === 'revoked' || updatingMemberId === row.original.id"
            @update:model-value="toggleAdmin(row.original, $event)"
          />
        </div>
      </template>

      <template #actions-data="{ row }">
        <div class="flex justify-end gap-1">
          <UButton
            icon="i-lucide-trash-2"
            size="xs"
            color="error"
            variant="ghost"
            :loading="deletingMemberId === row.original.id"
            @click="revokeMember(row.original)"
          />
        </div>
      </template>
    </UTable>
  </div>
</template>

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

interface MemberRow {
  id: string
  memberId: string | null
  name: string | null
  email: string
  invitedEmail: string
  role: 'admin' | 'member'
  status: 'pending' | 'active' | 'revoked'
  acceptedAt: string | null
  createdAt: string
}

const props = defineProps<{
  showHeader?: boolean
  bordered?: boolean
}>()

const { t } = useI18n()
const toast = useToast()

const showHeader = computed(() => props.showHeader ?? true)

const sectionClass = computed(() => {
  const classes = ['px-4', 'py-4', 'space-y-4']

  if (props.bordered ?? true) {
    classes.unshift('border-t', 'border-default')
  }

  return classes.join(' ')
})

const inviteForm = reactive({
  email: '',
})

const isInviting = ref(false)
const updatingMemberId = ref<string | null>(null)
const deletingMemberId = ref<string | null>(null)

const {
  data: members,
  pending,
  error,
  refresh,
} = await useFetch<MemberRow[]>('/api/bookings/members', {
  key: 'booking-members',
  default: () => [],
})

const columns = computed<TableColumn<MemberRow>[]>(() => [
  { accessorKey: 'name', header: t('bookingCalendar.memberNameColumn') },
  { accessorKey: 'email', header: t('bookingCalendar.memberEmailColumn') },
  { id: 'status', header: t('bookingCalendar.memberStatusColumn') },
  { id: 'admin', header: t('bookingCalendar.memberAdminColumn') },
  { id: 'actions', header: t('bookingCalendar.memberActionColumn') },
])

const visibleMembers = computed(() =>
  (members.value ?? []).filter((member) => member.status !== 'revoked'),
)

function statusColor(status: MemberRow['status']) {
  switch (status) {
    case 'active':
      return 'success'
    case 'pending':
      return 'warning'
    default:
      return 'neutral'
  }
}

function statusLabel(status: MemberRow['status']) {
  switch (status) {
    case 'active':
      return t('bookingCalendar.memberStatusActive')
    case 'pending':
      return t('bookingCalendar.memberStatusPending')
    default:
      return t('bookingCalendar.memberStatusRevoked')
  }
}

function errorMessage(error: unknown, fallbackKey: string) {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { message?: string } }).data
    if (data?.message) return data.message
  }

  return t(fallbackKey)
}

async function inviteMember() {
  if (!inviteForm.email.trim()) return

  isInviting.value = true
  try {
    await $fetch('/api/bookings/members/invite', {
      method: 'POST',
      body: {
        email: inviteForm.email,
        role: 'member',
      },
    })

    inviteForm.email = ''
    await refresh()
    toast.add({
      title: t('bookingCalendar.memberInviteSentToast'),
      color: 'success',
      icon: 'i-lucide-mail-check',
    })
  } catch (error) {
    toast.add({
      title: errorMessage(error, 'bookingCalendar.memberInviteErrorToast'),
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    isInviting.value = false
  }
}

async function toggleAdmin(member: MemberRow, enabled: boolean) {
  updatingMemberId.value = member.id
  try {
    await $fetch(`/api/bookings/members/${member.id}/role`, {
      method: 'PATCH',
      body: {
        role: enabled ? 'admin' : 'member',
      },
    })

    await refresh()
    toast.add({
      title: t('bookingCalendar.memberRoleUpdatedToast'),
      color: 'success',
      icon: 'i-lucide-shield-check',
    })
  } catch (error) {
    toast.add({
      title: errorMessage(error, 'bookingCalendar.memberRoleUpdateErrorToast'),
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    updatingMemberId.value = null
  }
}

async function revokeMember(member: MemberRow) {
  if (!confirm(t('bookingCalendar.revokeMemberConfirm', { email: member.email }))) return

  deletingMemberId.value = member.id
  try {
    await $fetch(`/api/bookings/members/${member.id}`, {
      method: 'DELETE',
    })

    await refresh()
    toast.add({
      title: t('bookingCalendar.memberRevokedToast'),
      color: 'success',
      icon: 'i-lucide-user-minus',
    })
  } catch (error) {
    toast.add({
      title: errorMessage(error, 'bookingCalendar.memberRevokeErrorToast'),
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    deletingMemberId.value = null
  }
}
</script>
