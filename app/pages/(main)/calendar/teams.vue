<template>
  <UPage>
    <UPageHeader :title="t('calendar.teamsTitle')" :description="t('calendar.teamsDescription')">
      <template #links />
    </UPageHeader>

    <UPageBody>
      <div class="space-y-6">
        <UBreadcrumb :items="breadcrumbs" />

        <UNavigationMenu :items="navItems" orientation="horizontal" />

        <UAlert
          v-if="!canManageTeams"
          color="warning"
          variant="soft"
          :title="$t('actions.noPermissionTitle')"
          :description="$t('actions.noPermissionDescription')"
        />

        <UCard v-else :ui="{ body: 'p-0 sm:p-0' }">
          <BookingCalendarTeamManagerTable v-model:teams="teamsModel" :loading="teamsPending" />
        </UCard>
      </div>
    </UPageBody>
  </UPage>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

definePageMeta({ layout: 'default', title: 'Calendario - Equipos' })

const { t } = useI18n()
const localePath = useLocalePath()
const { canManageTeams } = useRole()

useSeoMeta({
  title: () => t('calendar.teamsTitle'),
  description: () => t('calendar.teamsDescription'),
})

const navItems = computed<NavigationMenuItem[]>(() => [
  {
    label: t('calendar.bookings'),
    icon: 'i-lucide-calendar-check',
    to: localePath('/calendar/bookings'),
  },
  {
    label: t('calendar.locations'),
    icon: 'i-lucide-map-pin',
    to: localePath('/calendar/locations'),
  },
  { label: t('calendar.teams'), icon: 'i-lucide-users', to: localePath('/calendar/teams') },
])

const breadcrumbs = computed(() => [
  { label: t('nav.dashboard'), to: localePath('/dashboard') },
  { label: t('nav.calendar'), to: localePath('/calendar/bookings') },
  { label: t('calendar.teams') },
])

interface TeamUser {
  id: string
  email: string
  name: string | null
  role: string | null
}

interface TeamMember {
  id: string
  userId: string
  user: TeamUser
}

interface Team {
  id: string
  name: string
  members: TeamMember[]
}

const {
  data: teams,
  pending: teamsPending,
  refresh: refreshTeams,
} = useFetch<Team[]>('/api/teams', {
  query: { add: 'members' },
  immediate: false,
  default: () => [],
})

watch(
  () => canManageTeams.value,
  (allowed) => {
    if (allowed) {
      void refreshTeams()
    }
  },
  { immediate: true },
)

const teamsModel = computed<Team[]>({
  get() {
    return teams.value ?? []
  },
  set(value) {
    teams.value = value
  },
})
</script>
