<template>
  <div>
    <UPage>
      <UPageHeader
        :title="$t('bookingCalendar.pageTitle')"
        :description="$t('bookingCalendar.pageDescription')"
      >
        <template #links />
      </UPageHeader>

      <UPageBody>
        <div class="space-y-8">
          <UCard :ui="{ body: 'p-0 sm:p-0' }">
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-lg font-medium">
                  {{ $t('bookingCalendar.locationManagerTitle') }}
                </h3>
                <UButton
                  icon="i-lucide-plus"
                  :label="$t('bookingCalendar.newLocationButton')"
                  color="primary"
                  :disabled="!canManageLocations"
                  @click="openCreateLocation"
                />
              </div>
            </template>

            <BookingCalendarLocationManagerTable
              v-model:locations="locationsModel"
              :loading="pending"
              @edit-location="openEditLocation"
              @create-room="openCreateRoom"
              @edit-room="({ locationId, room }) => openEditRoom(locationId, room)"
            />
          </UCard>

          <UCard v-if="canManageTeams" :ui="{ body: 'p-0 sm:p-0' }">
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-lg font-medium">
                  {{ $t('bookingCalendar.teamTitle') }}
                </h3>
                <UButton
                  icon="i-lucide-plus"
                  :label="$t('bookingCalendar.teamsNewButton')"
                  color="primary"
                  :disabled="!canManageTeams"
                  @click="openCreateTeam"
                />
              </div>
            </template>

            <BookingCalendarTeamManagerTable
              ref="teamManagerTableRef"
              v-model:teams="teamsModel"
              :loading="teamsPending"
            />
          </UCard>
        </div>
      </UPageBody>
    </UPage>

    <BookingCalendarLocationFormModal
      v-model:open="locationFormOpen"
      :location="editingLocation ?? undefined"
      @saved="refresh"
    />

    <BookingCalendarRoomFormModal
      v-model:open="roomFormOpen"
      :location-id="targetLocationId"
      :room="editingRoom ?? undefined"
      @saved="refresh"
    />
  </div>
</template>

<script setup lang="ts">
interface Room {
  id: string
  name: string
}

interface Location {
  id: string
  name: string
  address: string | null
  rooms: Room[]
}

useI18n()
const toast = useToast()
const { canManageLocations, canManageRooms, canManageTeams } = useRole()

const {
  data: locations,
  pending,
  refresh,
} = await useFetch<Location[]>('/api/bookings/locations', { query: { add: 'rooms' } })

const locationsModel = computed<Location[]>({
  get() {
    return locations.value ?? []
  },
  set(value) {
    locations.value = value
  },
})

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

const teamManagerTableRef = ref<{ openCreateTeam: () => void } | null>(null)

function openCreateTeam() {
  teamManagerTableRef.value?.openCreateTeam()
}

// Location modal state
const locationFormOpen = ref(false)
const editingLocation = ref<Location | null>(null)

function openCreateLocation() {
  if (!canManageLocations.value) {
    toast.add({
      title: $t('actions.noPermissionTitle'),
      description: $t('actions.noPermissionDescription'),
      color: 'warning',
      icon: 'i-lucide-shield-alert',
    })
    return
  }
  editingLocation.value = null
  locationFormOpen.value = true
}

function openEditLocation(location: Location) {
  if (!canManageLocations.value) {
    toast.add({
      title: $t('actions.noPermissionTitle'),
      description: $t('actions.noPermissionDescription'),
      color: 'warning',
      icon: 'i-lucide-shield-alert',
    })
    return
  }
  editingLocation.value = location
  locationFormOpen.value = true
}

// Room modal state
const roomFormOpen = ref(false)
const targetLocationId = ref('')
const editingRoom = ref<Room | null>(null)

function openCreateRoom(locationId: string) {
  if (!canManageRooms.value) {
    toast.add({
      title: $t('actions.noPermissionTitle'),
      description: $t('actions.noPermissionDescription'),
      color: 'warning',
      icon: 'i-lucide-shield-alert',
    })
    return
  }
  targetLocationId.value = locationId
  editingRoom.value = null
  roomFormOpen.value = true
}

function openEditRoom(locationId: string, room: Room) {
  if (!canManageRooms.value) {
    toast.add({
      title: $t('actions.noPermissionTitle'),
      description: $t('actions.noPermissionDescription'),
      color: 'warning',
      icon: 'i-lucide-shield-alert',
    })
    return
  }
  targetLocationId.value = locationId
  editingRoom.value = room
  roomFormOpen.value = true
}
</script>
