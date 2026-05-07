<template>
  <div class="space-y-3">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <UButton
        icon="i-lucide-plus"
        color="primary"
        :label="t('bookingCalendar.teamsNewButton')"
        @click="openCreateTeam"
      />

      <UInput
        v-if="showSearch"
        v-model="search"
        :placeholder="t('bookingCalendar.searchPlaceholder')"
        icon="i-lucide-search"
        class="w-full sm:max-w-sm"
      />

      <div v-if="showSearch" class="text-sm text-muted sm:ml-auto">
        {{ filteredCountLabel }}
      </div>
    </div>

    <div class="overflow-x-auto">
      <UTable
        :data="tableRows"
        :columns="tableColumns"
        :loading="loading"
        :empty="t('bookingCalendar.teamsEmpty')"
        :get-sub-rows="(row) => (row.kind === 'team' ? row.children : [])"
        :expanded-options="{
          getRowCanExpand: (row) =>
            row.original.kind === 'team' && row.original.children.length > 0,
        }"
        :ui="{ th: 'whitespace-nowrap' }"
      >
        <template #loading>
          <div class="flex items-center justify-center gap-2 py-6 text-muted">
            <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
            <span class="text-sm">
              {{ t('actions.loading') }}
            </span>
          </div>
        </template>

        <template #teamName-cell="{ row }">
          <div
            class="flex items-center gap-2 min-w-0"
            :style="{ paddingLeft: row.original.kind === 'team' ? `${row.depth}rem` : undefined }"
          >
            <UButton
              size="xs"
              color="neutral"
              variant="outline"
              :icon="row.getIsExpanded() ? 'i-lucide-minus' : 'i-lucide-plus'"
              :disabled="!row.getCanExpand()"
              :class="row.getCanExpand() ? 'p-0 rounded-sm' : 'invisible p-0 rounded-sm'"
              :ui="{ leadingIcon: 'size-4' }"
              @click.stop="row.toggleExpanded()"
            />
            <UIcon
              name="i-lucide-users"
              class="text-primary size-4 shrink-0"
              :class="row.original.kind === 'team' ? '' : 'invisible'"
            />
            <span class="text-sm font-medium text-foreground truncate">
              {{ row.original.kind === 'team' ? row.original.teamName : '' }}
            </span>
          </div>
        </template>

        <template #memberLabel-cell="{ row }">
          <div
            class="flex items-center gap-2 min-w-0"
            :style="{ paddingLeft: row.original.kind === 'member' ? `${row.depth}rem` : undefined }"
          >
            <UIcon
              name="i-lucide-user-round"
              class="text-muted size-3.5 shrink-0"
              :class="row.original.kind === 'member' ? '' : 'invisible'"
            />
            <span class="text-sm text-foreground truncate">
              {{
                row.original.kind === 'team'
                  ? membersCountLabel(row.original.children.length)
                  : row.original.memberLabel
              }}
            </span>
          </div>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex justify-end gap-1">
            <UDropdownMenu :items="actionItems(row.original)">
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-lucide-ellipsis-vertical"
              />
            </UDropdownMenu>
          </div>
        </template>
      </UTable>
    </div>

    <div v-if="showPagination" class="flex justify-end">
      <UPagination v-model="page" :total="filteredTeams.length" :page-count="pageSize" />
    </div>

    <UModal
      v-model:open="teamFormModalOpen"
      :title="
        editingTeam ? t('bookingCalendar.teamEditTitle') : t('bookingCalendar.teamCreateTitle')
      "
      :description="t('bookingCalendar.teamsFormDescription')"
    >
      <template #body>
        <div class="space-y-3">
          <UInput
            v-model="teamNameInput"
            :placeholder="t('bookingCalendar.teamsNamePlaceholder')"
            class="w-full"
            :disabled="isSavingTeam"
          />
          <p v-if="teamFormError" class="text-sm text-error">
            {{ teamFormError }}
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            color="neutral"
            variant="soft"
            :label="t('actions.cancel')"
            :disabled="isSavingTeam"
            @click="teamFormModalOpen = false"
          />
          <UButton
            color="primary"
            :label="editingTeam ? t('actions.save') : t('actions.create')"
            :loading="isSavingTeam"
            @click="submitTeamForm"
          />
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="addMemberModalOpen"
      :title="t('bookingCalendar.teamAddMemberTitle')"
      :description="
        addMemberTeam
          ? t('bookingCalendar.teamAddMemberDescription', { name: addMemberTeam.name })
          : undefined
      "
    >
      <template #body>
        <div class="space-y-3">
          <USelectMenu
            v-model="selectedUserId"
            :items="userOptions"
            value-key="value"
            :placeholder="t('bookingCalendar.teamSelectUserPlaceholder')"
            class="w-full"
            :disabled="isAddingMember || usersLoading"
          />
          <p v-if="addMemberError" class="text-sm text-error">
            {{ addMemberError }}
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            color="neutral"
            variant="soft"
            :label="t('actions.cancel')"
            :disabled="isAddingMember"
            @click="addMemberModalOpen = false"
          />
          <UButton
            color="primary"
            :label="t('bookingCalendar.teamAddMemberButton')"
            :loading="isAddingMember"
            @click="confirmAddMember"
          />
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="deleteTeamModalOpen"
      :title="t('bookingCalendar.teamDeleteTitle')"
      :description="
        teamPendingDelete
          ? t('bookingCalendar.teamDeleteConfirm', { name: teamPendingDelete.name })
          : undefined
      "
    >
      <template #body>
        <p class="text-sm text-default">
          {{
            teamPendingDelete
              ? t('bookingCalendar.teamDeleteConfirm', { name: teamPendingDelete.name })
              : ''
          }}
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            color="neutral"
            variant="soft"
            :label="t('actions.cancel')"
            :disabled="isDeletingTeam"
            @click="deleteTeamModalOpen = false"
          />
          <UButton
            color="error"
            :label="t('actions.delete')"
            :loading="isDeletingTeam"
            @click="confirmDeleteTeam"
          />
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="removeMemberModalOpen"
      :title="t('bookingCalendar.teamRemoveMemberTitle')"
      :description="
        memberPendingRemove
          ? t('bookingCalendar.teamRemoveMemberConfirm', {
              name: memberPendingRemove.member.user.email,
            })
          : undefined
      "
    >
      <template #body>
        <p class="text-sm text-default">
          {{
            memberPendingRemove
              ? t('bookingCalendar.teamRemoveMemberConfirm', {
                  name: memberPendingRemove.member.user.email,
                })
              : ''
          }}
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            color="neutral"
            variant="soft"
            :label="t('actions.cancel')"
            :disabled="isRemovingMember"
            @click="removeMemberModalOpen = false"
          />
          <UButton
            color="error"
            :label="t('actions.delete')"
            :loading="isRemovingMember"
            @click="confirmRemoveMember"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { computed, ref, watch } from 'vue'
import { $fetch } from 'ofetch'
import { useI18n, useRole, useToast } from '#imports'

type UserOption = {
  label: string
  value: string
}

type TeamUser = {
  id: string
  email: string
  name: string | null
  role: string | null
}

type TeamMember = {
  id: string
  userId: string
  user: TeamUser
}

type Team = {
  id: string
  name: string
  members: TeamMember[]
}

type TeamRow = {
  kind: 'team'
  id: string
  teamName: string
  memberLabel: string
  team: Team
  children: MemberRow[]
}

type MemberRow = {
  kind: 'member'
  id: string
  teamName: string
  memberLabel: string
  teamId: string
  member: TeamMember
}

type TableRow = TeamRow | MemberRow

type RemoveMemberTarget = {
  teamId: string
  member: TeamMember
}

type AdminUserResponse = Array<{
  id: string
  email?: string
  name?: string | null
  role?: string | null
}>

type ErrorLike = {
  message?: unknown
  data?: unknown
}

type ErrorDataLike = {
  message?: unknown
}

defineProps<{
  loading?: boolean
}>()

const teams = defineModel<Team[]>('teams', { default: () => [] })

const { t } = useI18n()
const toast = useToast()
const { canManageTeams } = useRole()

const search = ref('')
const page = ref(1)
const pageSize = 10

const filteredTeams = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) return teams.value

  return teams.value.filter((team) => {
    const membersHaystack = team.members
      .map((member) => `${member.user.email} ${member.user.name ?? ''}`)
      .join(' ')
      .toLowerCase()
    return `${team.name} ${membersHaystack}`.toLowerCase().includes(query)
  })
})

const showSearch = computed(() => teams.value.length > pageSize)
const showPagination = computed(() => filteredTeams.value.length > pageSize)

const pagedTeams = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredTeams.value.slice(start, start + pageSize)
})

const tableRows = computed<TableRow[]>(() => {
  return pagedTeams.value.map((team) => ({
    kind: 'team',
    id: team.id,
    teamName: team.name,
    memberLabel: '',
    team,
    children: team.members.map((member) => ({
      kind: 'member',
      id: `${team.id}:${member.id}`,
      teamName: '',
      memberLabel: member.user.name
        ? `${member.user.name} (${member.user.email})`
        : member.user.email,
      teamId: team.id,
      member,
    })),
  }))
})

watch(
  () => search.value,
  () => {
    page.value = 1
  },
)

watch(
  () => filteredTeams.value.length,
  () => {
    const maxPage = Math.max(1, Math.ceil(filteredTeams.value.length / pageSize))
    if (page.value > maxPage) page.value = maxPage
  },
)

const filteredCountLabel = computed(() => {
  if (!showSearch.value) return ''
  return t('bookingCalendar.searchResultsLabel', {
    count: filteredTeams.value.length,
    total: teams.value.length,
  })
})

const tableColumns = computed<TableColumn<TableRow>[]>(() => [
  { accessorKey: 'teamName', header: t('bookingCalendar.teamNameLabel') },
  { accessorKey: 'memberLabel', header: t('bookingCalendar.teamMembersLabel') },
  { id: 'actions', header: '', meta: { class: { th: 'w-20', td: 'w-20' } } },
])

function membersCountLabel(count: number) {
  if (count === 0) return t('bookingCalendar.teamMembersCountZero')
  if (count === 1) return t('bookingCalendar.teamMembersCountOne')
  return t('bookingCalendar.teamMembersCountMany', { count })
}

function assertPermission(allowed: boolean) {
  if (allowed) return true
  toast.add({
    title: t('actions.noPermissionTitle'),
    description: t('actions.noPermissionDescription'),
    color: 'warning',
    icon: 'i-lucide-shield-alert',
  })
  return false
}

function getErrorMessage(error: unknown) {
  if (!error) return ''
  if (typeof error === 'string') return error
  if (typeof error !== 'object') return ''

  const maybe = error as ErrorLike
  const message = typeof maybe.message === 'string' ? maybe.message : ''

  if (maybe.data && typeof maybe.data === 'object') {
    const data = maybe.data as ErrorDataLike
    if (typeof data.message === 'string' && data.message) {
      return data.message
    }
  }

  return message
}

const teamFormModalOpen = ref(false)
const editingTeam = ref<Team | null>(null)
const teamNameInput = ref('')
const teamFormError = ref<string | null>(null)
const isSavingTeam = ref(false)

function openCreateTeam() {
  if (!assertPermission(canManageTeams.value)) return
  editingTeam.value = null
  teamNameInput.value = ''
  teamFormError.value = null
  teamFormModalOpen.value = true
}

function openEditTeam(team: Team) {
  if (!assertPermission(canManageTeams.value)) return
  editingTeam.value = team
  teamNameInput.value = team.name
  teamFormError.value = null
  teamFormModalOpen.value = true
}

async function submitTeamForm() {
  if (!assertPermission(canManageTeams.value)) return

  const name = teamNameInput.value.trim()
  if (!name) {
    teamFormError.value = t('bookingCalendar.teamNameRequired')
    return
  }

  isSavingTeam.value = true
  teamFormError.value = null

  try {
    if (editingTeam.value) {
      const updated = await $fetch<Team>(`/api/teams/${editingTeam.value.id}`, {
        method: 'PATCH',
        body: { name },
      })

      teams.value = teams.value.map((team) =>
        team.id === updated.id ? { ...team, name: updated.name } : team,
      )
    } else {
      const created = await $fetch<Team>('/api/teams', { method: 'POST', body: { name } })
      teams.value = [{ ...created, members: [] }, ...teams.value]
    }

    teamFormModalOpen.value = false
  } catch (error: unknown) {
    const message = getErrorMessage(error) || t('actions.tryAgain')
    teamFormError.value = message
    toast.add({
      title: t('errors.saveFailed'),
      description: message,
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    isSavingTeam.value = false
  }
}

watch(
  () => teamFormModalOpen.value,
  (open) => {
    if (!open && !isSavingTeam.value) {
      teamFormError.value = null
      editingTeam.value = null
      teamNameInput.value = ''
    }
  },
)

const deleteTeamModalOpen = ref(false)
const teamPendingDelete = ref<Team | null>(null)
const isDeletingTeam = ref(false)

function requestDeleteTeam(team: Team) {
  if (!assertPermission(canManageTeams.value)) return
  teamPendingDelete.value = team
  deleteTeamModalOpen.value = true
}

async function confirmDeleteTeam() {
  if (!teamPendingDelete.value) return
  if (!assertPermission(canManageTeams.value)) return

  isDeletingTeam.value = true
  const teamId = teamPendingDelete.value.id

  try {
    await $fetch(`/api/teams/${teamId}`, { method: 'DELETE' })
    teams.value = teams.value.filter((team) => team.id !== teamId)
    deleteTeamModalOpen.value = false
    teamPendingDelete.value = null
  } catch (error: unknown) {
    toast.add({
      title: t('bookingCalendar.teamDeleteErrorToast'),
      description: getErrorMessage(error) || t('actions.tryAgain'),
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    isDeletingTeam.value = false
  }
}

watch(
  () => deleteTeamModalOpen.value,
  (open) => {
    if (!open && !isDeletingTeam.value) {
      teamPendingDelete.value = null
    }
  },
)

const usersLoading = ref(false)
const availableUsers = ref<TeamUser[]>([])
const addMemberModalOpen = ref(false)
const addMemberTeam = ref<Team | null>(null)
const selectedUserId = ref('')
const addMemberError = ref<string | null>(null)
const isAddingMember = ref(false)

const userOptions = computed<UserOption[]>(() => {
  return availableUsers.value.map((user) => ({
    value: user.id,
    label: user.name ? `${user.name} (${user.email})` : user.email,
  }))
})

async function ensureUsersLoaded() {
  if (availableUsers.value.length > 0) return
  usersLoading.value = true

  try {
    const list = await $fetch<AdminUserResponse>('/api/admin/users')

    availableUsers.value = list
      .filter((u) => typeof u.id === 'string' && typeof u.email === 'string')
      .map((u) => ({
        id: u.id,
        email: u.email as string,
        name: typeof u.name === 'string' ? u.name : null,
        role: typeof u.role === 'string' ? u.role : null,
      }))
  } catch (error: unknown) {
    toast.add({
      title: t('bookingCalendar.teamLoadErrorTitle'),
      description: getErrorMessage(error) || t('bookingCalendar.teamLoadErrorDescription'),
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    usersLoading.value = false
  }
}

function openAddMember(team: Team) {
  if (!assertPermission(canManageTeams.value)) return
  addMemberTeam.value = team
  selectedUserId.value = ''
  addMemberError.value = null
  addMemberModalOpen.value = true
  void ensureUsersLoaded()
}

async function confirmAddMember() {
  if (!addMemberTeam.value) return
  if (!assertPermission(canManageTeams.value)) return

  const teamId = addMemberTeam.value.id
  const userId = selectedUserId.value

  if (!userId) {
    addMemberError.value = t('bookingCalendar.teamSelectUserRequired')
    return
  }

  isAddingMember.value = true
  addMemberError.value = null

  try {
    const created = await $fetch<TeamMember>(`/api/teams/${teamId}/members`, {
      method: 'POST',
      body: { userId },
    })

    teams.value = teams.value.map((team) => {
      if (team.id !== teamId) return team
      if (team.members.some((m) => m.id === created.id)) return team
      return { ...team, members: [...team.members, created] }
    })

    addMemberModalOpen.value = false
  } catch (error: unknown) {
    const message = getErrorMessage(error) || t('actions.tryAgain')
    addMemberError.value = message
    toast.add({
      title: t('errors.saveFailed'),
      description: message,
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    isAddingMember.value = false
  }
}

watch(
  () => addMemberModalOpen.value,
  (open) => {
    if (!open && !isAddingMember.value) {
      addMemberTeam.value = null
      selectedUserId.value = ''
      addMemberError.value = null
    }
  },
)

const removeMemberModalOpen = ref(false)
const memberPendingRemove = ref<RemoveMemberTarget | null>(null)
const isRemovingMember = ref(false)

function requestRemoveMember(teamId: string, member: TeamMember) {
  if (!assertPermission(canManageTeams.value)) return
  memberPendingRemove.value = { teamId, member }
  removeMemberModalOpen.value = true
}

async function confirmRemoveMember() {
  if (!memberPendingRemove.value) return
  if (!assertPermission(canManageTeams.value)) return

  const { teamId, member } = memberPendingRemove.value
  isRemovingMember.value = true

  try {
    await $fetch(`/api/teams/${teamId}/members/${member.id}`, { method: 'DELETE' })
    teams.value = teams.value.map((team) => {
      if (team.id !== teamId) return team
      return { ...team, members: team.members.filter((m) => m.id !== member.id) }
    })

    removeMemberModalOpen.value = false
    memberPendingRemove.value = null
  } catch (error: unknown) {
    toast.add({
      title: t('bookingCalendar.teamMemberDeleteErrorToast'),
      description: getErrorMessage(error) || t('actions.tryAgain'),
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    isRemovingMember.value = false
  }
}

watch(
  () => removeMemberModalOpen.value,
  (open) => {
    if (!open && !isRemovingMember.value) {
      memberPendingRemove.value = null
    }
  },
)

function actionItems(row: TableRow) {
  if (row.kind === 'team') {
    return [
      [
        {
          label: t('actions.edit'),
          icon: 'i-lucide-pencil',
          onSelect: () => openEditTeam(row.team),
        },
        {
          label: t('bookingCalendar.teamAddMemberButton'),
          icon: 'i-lucide-user-plus',
          onSelect: () => openAddMember(row.team),
        },
      ],
      [
        {
          label: t('actions.delete'),
          icon: 'i-lucide-trash-2',
          color: 'error' as const,
          onSelect: () => requestDeleteTeam(row.team),
        },
      ],
    ]
  }

  return [
    [
      {
        label: t('actions.delete'),
        icon: 'i-lucide-user-minus',
        color: 'error' as const,
        onSelect: () => requestRemoveMember(row.teamId, row.member),
      },
    ],
  ]
}
</script>
