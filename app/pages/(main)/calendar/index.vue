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
        <div v-if="pending" class="flex justify-center py-12">
          <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted" />
        </div>

        <div v-else class="space-y-8">
          <section class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-medium mb-2">
                {{ $t('bookingCalendar.locationManagerTitle') }}
              </h3>
              <UButton
                icon="i-lucide-plus"
                :label="$t('bookingCalendar.newLocationButton')"
                color="primary"
                @click="openCreateLocation"
              />
            </div>

            <div v-if="!locations?.length" class="py-12 text-center text-muted">
              <UIcon name="i-lucide-map-pin-off" class="size-8 mb-3 mx-auto" />
              <p class="text-sm">
                {{ $t('bookingCalendar.noLocations') }}
              </p>
            </div>

            <BookingCalendarLocationManagerCard
              v-for="location in locations"
              :key="location.id"
              :location="location"
              @edit-location="openEditLocation(location)"
              @delete-location="deleteLocation(location)"
              @add-room="openCreateRoom(location.id)"
              @edit-room="(room) => openEditRoom(location.id, room)"
              @delete-room="(room) => deleteRoom(location.id, room)"
            />
          </section>
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

const {
  data: locations,
  pending,
  refresh,
} = await useFetch<Location[]>('/api/bookings/locations', { query: { add: 'rooms' } })

// Location modal state
const locationFormOpen = ref(false)
const editingLocation = ref<Location | null>(null)

function openCreateLocation() {
  editingLocation.value = null
  locationFormOpen.value = true
}

function openEditLocation(location: Location) {
  editingLocation.value = location
  locationFormOpen.value = true
}

async function deleteLocation(location: Location) {
  if (!confirm($t('bookingCalendar.deleteLocationConfirm', { name: location.name }))) return
  try {
    await $fetch(`/api/bookings/locations/${location.id}`, { method: 'DELETE' })
    await refresh()
    toast.add({
      title: $t('bookingCalendar.locationDeletedToast'),
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
  } catch {
    toast.add({
      title: $t('bookingCalendar.locationDeleteErrorToast'),
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  }
}

// Room modal state
const roomFormOpen = ref(false)
const targetLocationId = ref('')
const editingRoom = ref<Room | null>(null)

function openCreateRoom(locationId: string) {
  targetLocationId.value = locationId
  editingRoom.value = null
  roomFormOpen.value = true
}

function openEditRoom(locationId: string, room: Room) {
  targetLocationId.value = locationId
  editingRoom.value = room
  roomFormOpen.value = true
}

async function deleteRoom(locationId: string, room: Room) {
  if (!confirm($t('bookingCalendar.deleteRoomConfirm', { name: room.name }))) return
  try {
    await $fetch(`/api/bookings/locations/${locationId}/rooms/${room.id}`, {
      method: 'DELETE',
    })
    await refresh()
    toast.add({
      title: $t('bookingCalendar.roomDeletedToast'),
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
  } catch {
    toast.add({
      title: $t('bookingCalendar.roomDeleteErrorToast'),
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  }
}
</script>
