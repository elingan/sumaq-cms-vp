<script setup lang="ts">
interface CalendarLocation {
  id: string
  name: string
}

interface Props {
  locations?: CalendarLocation[]
  canCreateBookings: boolean
}

withDefaults(defineProps<Props>(), {
  locations: () => [],
})

const emit = defineEmits<{
  (e: 'create-booking'): void
  (e: 'view-location', locationId: string): void
}>()
</script>

<template>
  <UCard :title="$t('nav.calendar')" :description="$t('dashboard.calendarSubtitle')" class="w-full">
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div>
          <h2 class="text-lg font-semibold text-foreground">
            {{ $t('nav.calendar') }}
          </h2>
          <p class="text-sm text-muted">
            {{ $t('dashboard.calendarSubtitle') }}
          </p>
        </div>
        <UButton
          v-if="canCreateBookings"
          icon="i-lucide-plus"
          :label="$t('actions.createCalendar')"
          color="primary"
          @click="emit('create-booking')"
        />
      </div>
    </template>

    <UPageGrid v-if="locations.length">
      <CalendarLocationCard
        v-for="location in locations"
        :key="location.id"
        :location="location"
        :rooms-count="0"
        :bookings-count="0"
        @view="emit('view-location', location.id)"
      />
    </UPageGrid>

    <UEmpty
      v-else
      :title="$t('dashboard.noCalendar')"
      :description="$t('dashboard.noCalendarDescription')"
      variant="soft"
    >
      <template #default>
        <UButton
          v-if="canCreateBookings"
          icon="i-lucide-arrow-right"
          :label="$t('actions.createCalendar')"
          @click="emit('create-booking')"
        />
      </template>
    </UEmpty>
  </UCard>
</template>
