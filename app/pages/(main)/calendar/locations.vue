<template>
  <div>
    <UPage>
      <UPageHeader
        :title="t('calendar.locationsTitle')"
        :description="t('calendar.locationsDescription')"
      >
        <template #links>
          <UButton
            icon="i-lucide-plus"
            :label="$t('bookingCalendar.newLocationButton')"
            color="primary"
            :disabled="!canManageLocations"
            @click="openCreateLocation"
          />
        </template>
      </UPageHeader>

      <UPageBody>
        <div class="space-y-6">
          <UBreadcrumb :items="breadcrumbs" />

          <UNavigationMenu :items="navItems" orientation="horizontal" />

          <UCard :ui="{ body: 'p-0 sm:p-0' }">
            <BookingCalendarLocationManagerTable
              v-model:locations="locationsModel"
              :loading="pending"
              @edit-location="openEditLocation"
              @create-room="openCreateRoom"
              @edit-room="({ locationId, room }) => openEditRoom(locationId, room)"
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
import type { NavigationMenuItem } from '@nuxt/ui'

definePageMeta({ layout: 'default', title: 'Calendario - Ubicaciones' })

const { t } = useI18n()
const localePath = useLocalePath()
const toast = useToast()
const { canManageLocations, canManageRooms } = useRole()

useSeoMeta({
  title: () => t('calendar.locationsTitle'),
  description: () => t('calendar.locationsDescription'),
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
  { label: t('calendar.locations') },
])

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
