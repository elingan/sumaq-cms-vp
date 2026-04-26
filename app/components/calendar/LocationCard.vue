<template>
  <UCard
    :to="`/bookings/${location.id}`"
    target="_self"
    class="cursor-pointer hover:shadow-lg transition-shadow"
    :ui="{ base: 'overflow-hidden' }"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <UIcon name="i-lucide-map-pin" class="text-primary size-5" />
        <div>
          <h3 class="font-semibold text-foreground">
            {{ location.name }}
          </h3>
          <p class="text-sm text-muted">
            {{ roomsLabel }}
          </p>
        </div>
      </div>
    </template>

    <div class="space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-elevated p-3 rounded-lg">
          <p class="text-xs text-muted">
            {{ $t('dashboard.bookings') }}
          </p>
          <p class="text-lg font-semibold text-foreground">
            {{ bookingsCount }}
          </p>
        </div>
        <div class="bg-elevated p-3 rounded-lg">
          <p class="text-xs text-muted">
            {{ $t('dashboard.rooms') }}
          </p>
          <p class="text-lg font-semibold text-foreground">
            {{ roomsCount }}
          </p>
        </div>
      </div>
    </div>

    <template #footer>
      <UButton
        color="primary"
        variant="soft"
        :label="$t('actions.view')"
        trailing-icon="i-lucide-arrow-right"
        class="w-full"
        @click.prevent.stop="$emit('view')"
      />
    </template>
  </UCard>
</template>

<script setup lang="ts">
interface Props {
  location: {
    id: string
    name: string
  }
  roomsCount?: number
  bookingsCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  roomsCount: 0,
  bookingsCount: 0,
})

defineEmits<{
  view: []
}>()

const { t: $t } = useI18n()

const roomsLabel = computed(() => {
  const count = props.roomsCount
  if (count === 0) return $t('dashboard.noRooms')
  if (count === 1) return $t('dashboard.oneRoom')
  return $t('dashboard.multipleRooms', { count })
})
</script>
