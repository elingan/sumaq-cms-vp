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
        :data="tableRows"
        :columns="tableColumns"
        :loading="loading"
        :empty="t('bookingCalendar.noLocations')"
        :get-sub-rows="(row) => (row.kind === 'location' ? row.children : [])"
        :expanded-options="{
          getRowCanExpand: (row) =>
            row.original.kind === 'location' ? row.original.children.length > 0 : false,
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

        <template #locationName-cell="{ row }">
          <div
            class="flex items-center gap-2 min-w-0"
            :style="{
              paddingLeft: row.original.kind === 'location' ? `${row.depth}rem` : undefined,
            }"
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
              name="i-lucide-map-pin"
              class="text-primary size-4 shrink-0"
              :class="row.original.kind === 'location' ? '' : 'invisible'"
            />
            <span class="text-sm font-medium text-foreground truncate">
              {{ row.original.kind === 'location' ? row.original.locationName : '' }}
            </span>
          </div>
        </template>

        <template #address-cell="{ row }">
          <span class="text-sm text-muted truncate">
            {{ row.original.kind === 'location' ? row.original.address || '—' : '—' }}
          </span>
        </template>

        <template #roomName-cell="{ row }">
          <div
            class="flex items-center gap-2 min-w-0"
            :style="{ paddingLeft: row.original.kind === 'room' ? `${row.depth}rem` : undefined }"
          >
            <UIcon
              name="i-lucide-door-open"
              class="text-muted size-3.5 shrink-0"
              :class="row.original.kind === 'room' ? '' : 'invisible'"
            />
            <span class="text-sm text-foreground truncate">
              {{
                row.original.kind === 'location'
                  ? roomsCountLabel(row.original.children.length)
                  : row.original.roomName
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

type LocationRow = {
  kind: 'location'
  id: string
  locationName: string
  roomName: string
  address: string | null
  location: Location
  children: RoomRow[]
}

type RoomRow = {
  kind: 'room'
  id: string
  locationName: string
  roomName: string
  address: null
  locationId: string
  room: Room
}

type TableRow = LocationRow | RoomRow

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

const tableRows = computed<TableRow[]>(() => {
  return pagedLocations.value.map((location) => ({
    kind: 'location',
    id: location.id,
    locationName: location.name,
    roomName: '',
    address: location.address,
    location,
    children: location.rooms.map((room) => ({
      kind: 'room',
      id: `${location.id}:${room.id}`,
      locationName: '',
      roomName: room.name,
      address: null,
      locationId: location.id,
      room,
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

const tableColumns = computed<TableColumn<TableRow>[]>(() => [
  { accessorKey: 'locationName', header: t('bookingCalendar.nameLabel') },
  { accessorKey: 'roomName', header: t('bookingCalendar.roomNameLabel') },
  { accessorKey: 'address', header: t('bookingCalendar.addressLabel') },
  { id: 'actions', header: '', meta: { class: { th: 'w-20', td: 'w-20' } } },
])

function roomsCountLabel(count: number) {
  if (count === 0) return t('dashboard.noRooms')
  if (count === 1) return t('dashboard.oneRoom')
  return t('dashboard.multipleRooms', { count })
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

function actionItems(row: TableRow) {
  if (row.kind === 'location') {
    return [
      [
        {
          label: t('actions.edit'),
          icon: 'i-lucide-pencil',
          onSelect: () => handleEditLocation(row.location),
        },
        {
          label: t('bookingCalendar.newRoomButton'),
          icon: 'i-lucide-plus',
          onSelect: () => handleCreateRoom(row.location.id),
        },
      ],
      [
        {
          label: t('actions.delete'),
          icon: 'i-lucide-trash-2',
          color: 'error' as const,
          onSelect: () => requestDeleteLocation(row.location),
        },
      ],
    ]
  }

  return [
    [
      {
        label: t('actions.edit'),
        icon: 'i-lucide-pencil',
        onSelect: () => handleEditRoom(row.locationId, row.room),
      },
    ],
    [
      {
        label: t('actions.delete'),
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect: () => requestDeleteRoom(row.locationId, row.room),
      },
    ],
  ]
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
