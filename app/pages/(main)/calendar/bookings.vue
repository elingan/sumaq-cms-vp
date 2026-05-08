<template>
  <UPage>
    <UPageHeader
      :title="t('calendar.bookingsTitle')"
      :description="t('calendar.bookingsDescription')"
    >
      <template #links>
        <USelect
          v-model="selectedLocationId"
          :items="locationItems"
          class="w-56"
          :disabled="pending || locationItems.length === 0"
        />
        <UButton
          icon="i-lucide-arrow-right"
          color="primary"
          :label="t('calendar.openBookingsButton')"
          :disabled="!selectedLocationId"
          @click="openBookings"
        />
      </template>
    </UPageHeader>

    <UPageBody>
      <div class="space-y-6">
        <UBreadcrumb :items="breadcrumbs" />

        <UNavigationMenu :items="navItems" orientation="horizontal" />

        <div v-if="pending" class="flex justify-center py-12">
          <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted" />
        </div>

        <UAlert
          v-else-if="locationsError"
          color="error"
          variant="soft"
          :title="t('errors.loadFailed')"
          :description="locationsError.data?.message ?? t('errors.loadFailed')"
        />

        <UEmpty
          v-else-if="locationItems.length === 0"
          :title="t('bookingCalendar.noLocations')"
          :description="t('bookingCalendar.noLocations')"
          variant="soft"
        />

        <UCard v-else>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="text-sm text-muted">
              {{ t('calendar.bookingsHint') }}
            </div>
            <UButton
              icon="i-lucide-arrow-right"
              color="primary"
              :label="t('calendar.openBookingsButton')"
              :disabled="!selectedLocationId"
              @click="openBookings"
            />
          </div>
        </UCard>
      </div>
    </UPageBody>
  </UPage>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

definePageMeta({ layout: 'default', title: 'Calendario - Reservas' })

const { t } = useI18n()
const localePath = useLocalePath()

useSeoMeta({
  title: () => t('calendar.bookingsTitle'),
  description: () => t('calendar.bookingsDescription'),
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
  { label: t('calendar.bookings') },
])

interface LocationItem {
  id: string
  name: string
}

const {
  data: locations,
  pending,
  error: locationsError,
} = await useFetch<LocationItem[]>('/api/bookings/locations')

const selectedLocationId = ref('')

watch(
  () => locations.value,
  (items) => {
    if (!selectedLocationId.value && items?.length) {
      selectedLocationId.value = items[0]?.id ?? ''
    }
  },
  { immediate: true },
)

const locationItems = computed(() =>
  (locations.value || []).map((location) => ({ label: location.name, value: location.id })),
)

function openBookings() {
  if (!selectedLocationId.value) return
  navigateTo(`/bookings/${selectedLocationId.value}`)
}
</script>
