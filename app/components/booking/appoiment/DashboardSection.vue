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
  (e: 'create-appointment'): void
  (e: 'view-location', locationId: string): void
}>()
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div>
          <h2 class="text-lg font-semibold text-foreground">
            {{ $t('dashboard.appointmentBooking') }}
          </h2>
          <p class="text-sm text-muted">
            {{ $t('dashboard.appointmentSubtitle') }}
          </p>
        </div>
        <UButton
          v-if="canCreateBookings"
          icon="i-lucide-plus"
          :label="$t('actions.createAppointment')"
          color="primary"
          @click="emit('create-appointment')"
        />
      </div>
    </template>

    <UEmpty
      :title="$t('dashboard.noAppointments')"
      :description="$t('dashboard.noAppointmentsDescription')"
      variant="soft"
    >
      <template #default>
        <UButton
          v-if="canCreateBookings"
          icon="i-lucide-arrow-right"
          :label="$t('actions.createAppointment')"
          @click="emit('create-appointment')"
        />
      </template>
    </UEmpty>
  </UCard>
</template>
