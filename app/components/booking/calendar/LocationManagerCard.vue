<template>
  <UCard :ui="{ body: 'p-0', header: 'px-4 py-3', footer: 'px-4 py-3' }">
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2 min-w-0">
          <UIcon name="i-lucide-map-pin" class="text-primary size-4 shrink-0" />
          <span class="font-semibold text-foreground truncate">
            {{ t('bookingManager.locationPrefix') }}: {{ location.name }}
          </span>
          <span v-if="location.address" class="text-sm text-muted truncate hidden sm:block">
            — {{ location.address }}
          </span>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <UButton
            size="xs"
            color="neutral"
            variant="soft"
            icon="i-lucide-pencil"
            :label="t('actions.edit')"
            @click="$emit('edit-location')"
          />
          <UButton
            size="xs"
            color="error"
            variant="soft"
            icon="i-lucide-trash-2"
            :label="t('actions.delete')"
            @click="$emit('delete-location')"
          />
        </div>
      </div>
    </template>

    <div class="divide-y divide-default">
      <div class="px-4 py-2">
        <p class="text-sm text-muted">
          {{ t('bookingManager.roomsAvailable') }}
        </p>
      </div>

      <div v-if="location.rooms.length === 0" class="px-4 py-3">
        <p class="text-sm text-muted italic">
          {{ t('bookingManager.noRoomsRegistered') }}
        </p>
      </div>

      <div
        v-for="room in location.rooms"
        :key="room.id"
        class="flex items-center justify-between px-4 py-2 gap-3"
      >
        <div class="flex items-center gap-2 min-w-0">
          <UIcon name="i-lucide-door-open" class="size-3.5 text-muted shrink-0" />
          <span class="text-sm text-foreground truncate">{{ room.name }}</span>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-pencil"
            :label="t('actions.edit')"
            @click="$emit('edit-room', room)"
          />
          <UButton
            size="xs"
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            :label="t('actions.delete')"
            @click="$emit('delete-room', room)"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <UButton
        size="xs"
        color="primary"
        variant="soft"
        icon="i-lucide-plus"
        :label="t('bookingManager.newRoomButton')"
        @click="$emit('add-room')"
      />
    </template>
  </UCard>
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

defineProps<{
  location: Location
}>()

defineEmits<{
  'edit-location': []
  'delete-location': []
  'add-room': []
  'edit-room': [room: Room]
  'delete-room': [room: Room]
}>()

const { t } = useI18n()
</script>
