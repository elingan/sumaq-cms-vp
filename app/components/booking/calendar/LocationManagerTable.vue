<template>
  <div class="space-y-3">
    <div v-if="showSearch" class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <UInput
        v-model="search"
        :placeholder="t('bookingCalendar.searchPlaceholder')"
        icon="i-lucide-search"
        class="w-full sm:max-w-sm"
      />
      <div class="text-sm text-muted sm:ml-auto">
        {{ filteredCountLabel }}
      </div>
    </div>

    <div class="overflow-x-auto">
      <UTable
        :data="pagedLocations"
        :columns="locationColumns"
        :loading="loading"
        :empty="t('bookingCalendar.noLocations')"
        :expanded-options="{ getRowCanExpand: () => true }"
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

        <template #expander-cell="{ row }">
          <UTooltip :text="row.getIsExpanded() ? t('actions.collapse') : t('actions.expand')">
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              :icon="row.getIsExpanded() ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
              @click.stop="row.toggleExpanded()"
            />
          </UTooltip>
        </template>

        <template #name-cell="{ row }">
          <div class="flex items-center gap-2 min-w-0">
            <UIcon name="i-lucide-map-pin" class="text-primary size-4 shrink-0" />
            <span class="text-sm font-medium text-foreground truncate">
              {{ row.original.name }}
            </span>
          </div>
        </template>

        <template #address-cell="{ row }">
          <span class="text-sm text-muted truncate">
            {{ row.original.address || '—' }}
          </span>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex justify-end gap-1">
            <UTooltip :text="`${t('actions.edit')}: ${row.original.name}`">
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-lucide-pencil"
                @click="handleEditLocation(row.original)"
              />
            </UTooltip>
            <UTooltip :text="`${t('actions.delete')}: ${row.original.name}`">
              <UButton
                size="xs"
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                @click="requestDeleteLocation(row.original)"
              />
            </UTooltip>
          </div>
        </template>

        <template #expanded="{ row }">
          <div class="space-y-3 bg-accented/20">
            <div
              v-if="row.original.rooms.length === 0"
              class="flex items-center justify-between gap-3"
            >
              <p class="text-sm text-muted italic">
                {{ t('bookingCalendar.noRoomsRegistered') }}
              </p>
              <UButton
                size="xs"
                color="primary"
                variant="soft"
                icon="i-lucide-plus"
                :label="t('bookingCalendar.newRoomButton')"
                @click="handleCreateRoom(row.original.id)"
              />
            </div>

            <div v-else class="overflow-x-auto">
              <UTable
                :data="row.original.rooms"
                :columns="roomColumns"
                :empty="t('bookingCalendar.noRoomsRegistered')"
                :ui="{ thead: 'hidden', separator: 'hidden' }"
              >
                <template #name-cell="{ row: roomRow }">
                  <div class="flex items-center gap-2 min-w-0">
                    <UIcon name="i-lucide-door-open" class="size-3.5 text-muted shrink-0" />
                    <span class="text-sm text-foreground truncate">
                      {{ roomRow.original.name }}
                    </span>
                  </div>
                </template>

                <template #actions-cell="{ row: roomRow }">
                  <div class="flex justify-end gap-1">
                    <UTooltip :text="`${t('actions.edit')}: ${roomRow.original.name}`">
                      <UButton
                        size="xs"
                        color="neutral"
                        variant="ghost"
                        icon="i-lucide-pencil"
                        @click="handleEditRoom(row.original.id, roomRow.original)"
                      />
                    </UTooltip>
                    <UTooltip :text="`${t('actions.delete')}: ${roomRow.original.name}`">
                      <UButton
                        size="xs"
                        color="error"
                        variant="ghost"
                        icon="i-lucide-trash-2"
                        @click="requestDeleteRoom(row.original.id, roomRow.original)"
                      />
                    </UTooltip>
                  </div>
                </template>
              </UTable>
              <div class="flex items-center justify-between gap-3 p-4 border-t border-accented">
                <UButton
                  size="xs"
                  color="primary"
                  variant="soft"
                  icon="i-lucide-plus"
                  :label="t('bookingCalendar.newRoomButton')"
                  @click="handleCreateRoom(row.original.id)"
                />
              </div>
            </div>
          </div>
        </template>
      </UTable>
    </div>

    <div v-if="showPagination" class="flex justify-end">
      <UPagination v-model="page" :total="filteredLocations.length" :page-count="pageSize" />
    </div>

    <UModal
      v-model:open="deleteLocationModalOpen"
      :title="t('bookingCalendar.deleteLocationTitle')"
      :description="
        locationPendingDelete
          ? t('bookingCalendar.deleteLocationConfirm', { name: locationPendingDelete.name })
          : undefined
      "
    >
      <template #body>
        <p class="text-sm text-default">
          {{
            locationPendingDelete
              ? t('bookingCalendar.deleteLocationConfirm', { name: locationPendingDelete.name })
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
            :disabled="isDeletingLocation"
            @click="deleteLocationModalOpen = false"
          />
          <UButton
            color="error"
            :label="t('actions.delete')"
            :loading="isDeletingLocation"
            @click="confirmDeleteLocation"
          />
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="deleteRoomModalOpen"
      :title="t('bookingCalendar.deleteRoomTitle')"
      :description="
        roomPendingDelete
          ? t('bookingCalendar.deleteRoomConfirm', { name: roomPendingDelete.room.name })
          : undefined
      "
    >
      <template #body>
        <p class="text-sm text-default">
          {{
            roomPendingDelete
              ? t('bookingCalendar.deleteRoomConfirm', { name: roomPendingDelete.room.name })
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
            :disabled="isDeletingRoom"
            @click="deleteRoomModalOpen = false"
          />
          <UButton
            color="error"
            :label="t('actions.delete')"
            :loading="isDeletingRoom"
            @click="confirmDeleteRoom"
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

type EditRoomPayload = {
  locationId: string
  room: Room
}

type RoomDeleteTarget = {
  locationId: string
  room: Room
}

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

const emit = defineEmits<{
  'create-room': [locationId: string]
  'edit-location': [location: Location]
  'edit-room': [payload: EditRoomPayload]
}>()

const locations = defineModel<Location[]>('locations', { default: () => [] })

const { t } = useI18n()
const toast = useToast()
const { canManageLocations, canManageRooms } = useRole()

const search = ref('')
const page = ref(1)
const pageSize = 10

const filteredLocations = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) {
    return locations.value
  }

  return locations.value.filter((location) => {
    const haystack = `${location.name} ${location.address ?? ''}`.toLowerCase()
    return haystack.includes(query)
  })
})

const showSearch = computed(() => locations.value.length > pageSize)
const showPagination = computed(() => filteredLocations.value.length > pageSize)

const pagedLocations = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredLocations.value.slice(start, start + pageSize)
})

watch(
  () => search.value,
  () => {
    page.value = 1
  },
)

watch(
  () => filteredLocations.value.length,
  () => {
    const maxPage = Math.max(1, Math.ceil(filteredLocations.value.length / pageSize))
    if (page.value > maxPage) {
      page.value = maxPage
    }
  },
)

const filteredCountLabel = computed(() => {
  if (!showSearch.value) return ''
  return t('bookingCalendar.searchResultsLabel', {
    count: filteredLocations.value.length,
    total: locations.value.length,
  })
})

const locationColumns = computed<TableColumn<Location>[]>(() => [
  { id: 'expander', header: '', meta: { class: { th: 'w-8', td: 'w-8' } } },
  { accessorKey: 'name', header: t('bookingCalendar.nameLabel') },
  { accessorKey: 'address', header: t('bookingCalendar.addressLabel') },
  { id: 'actions', header: '', meta: { class: { th: 'w-20', td: 'w-20' } } },
])

const roomColumns = computed<TableColumn<Room>[]>(() => [
  { accessorKey: 'name', header: '' },
  { id: 'actions', header: '', meta: { class: { th: 'w-20', td: 'w-20' } } },
])

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

function handleEditLocation(location: Location) {
  if (!assertPermission(canManageLocations.value)) return
  emit('edit-location', location)
}

function handleCreateRoom(locationId: string) {
  if (!assertPermission(canManageRooms.value)) return
  emit('create-room', locationId)
}

function handleEditRoom(locationId: string, room: Room) {
  if (!assertPermission(canManageRooms.value)) return
  emit('edit-room', { locationId, room })
}

const deleteLocationModalOpen = ref(false)
const locationPendingDelete = ref<Location | null>(null)
const isDeletingLocation = ref(false)

function requestDeleteLocation(location: Location) {
  if (!assertPermission(canManageLocations.value)) return
  locationPendingDelete.value = location
  deleteLocationModalOpen.value = true
}

async function confirmDeleteLocation() {
  if (!locationPendingDelete.value) return
  if (!assertPermission(canManageLocations.value)) return

  const locationId = locationPendingDelete.value.id
  isDeletingLocation.value = true

  try {
    await $fetch(`/api/bookings/locations/${locationId}`, { method: 'DELETE' })
    locations.value = locations.value.filter((location) => location.id !== locationId)
    toast.add({
      title: t('bookingCalendar.locationDeletedToast'),
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    deleteLocationModalOpen.value = false
    locationPendingDelete.value = null
  } catch (error: unknown) {
    toast.add({
      title: t('bookingCalendar.locationDeleteErrorToast'),
      description: getErrorMessage(error) || t('actions.tryAgain'),
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    isDeletingLocation.value = false
  }
}

watch(
  () => deleteLocationModalOpen.value,
  (open) => {
    if (!open && !isDeletingLocation.value) {
      locationPendingDelete.value = null
    }
  },
)

const deleteRoomModalOpen = ref(false)
const roomPendingDelete = ref<RoomDeleteTarget | null>(null)
const isDeletingRoom = ref(false)

function requestDeleteRoom(locationId: string, room: Room) {
  if (!assertPermission(canManageRooms.value)) return
  roomPendingDelete.value = { locationId, room }
  deleteRoomModalOpen.value = true
}

async function confirmDeleteRoom() {
  if (!roomPendingDelete.value) return
  if (!assertPermission(canManageRooms.value)) return

  const { locationId, room } = roomPendingDelete.value
  isDeletingRoom.value = true

  try {
    await $fetch(`/api/bookings/locations/${locationId}/rooms/${room.id}`, { method: 'DELETE' })
    locations.value = locations.value.map((location) => {
      if (location.id !== locationId) return location
      return { ...location, rooms: location.rooms.filter((r) => r.id !== room.id) }
    })
    toast.add({
      title: t('bookingCalendar.roomDeletedToast'),
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    deleteRoomModalOpen.value = false
    roomPendingDelete.value = null
  } catch (error: unknown) {
    toast.add({
      title: t('bookingCalendar.roomDeleteErrorToast'),
      description: getErrorMessage(error) || t('actions.tryAgain'),
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    isDeletingRoom.value = false
  }
}

watch(
  () => deleteRoomModalOpen.value,
  (open) => {
    if (!open && !isDeletingRoom.value) {
      roomPendingDelete.value = null
    }
  },
)
</script>
