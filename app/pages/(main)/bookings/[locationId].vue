<template>
  <UPage>
    <UPageHeader title="Reservas" description="Gestion de salas con recurrencia y excepciones.">
      <template #links>
        <USelect
          v-model="selectedLocationId"
          :items="locationItems"
          class="w-56"
          @update:model-value="handleLocationChange"
        />
      </template>
    </UPageHeader>

    <UCard class="mb-4">
      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-chevron-left"
          color="neutral"
          variant="subtle"
          @click="changeDay(-1)"
        />
        <div class="text-sm font-medium text-highlighted">
          {{ currentDayLabel }}
        </div>
        <UButton
          icon="i-lucide-chevron-right"
          color="neutral"
          variant="subtle"
          @click="changeDay(1)"
        />
      </div>
    </UCard>

    <CalendarBookingGrid
      :rooms="bookingData?.rooms || []"
      :bookings="bookingData?.bookings || []"
      :selected-date="selectedDate"
      @select-available="openCreate"
      @select-booked="openBooked"
    />

    <CalendarBookingModal
      v-model:open="isModalOpen"
      :mode="modalMode"
      :rooms="bookingData?.rooms || []"
      :selection="selectedSelection"
      :booking="selectedBooking"
      :can-create-recurring="canCreateRecurring"
      @saved="refreshBookings"
    />
  </UPage>
</template>

<script setup lang="ts">
import { addDays, format } from 'date-fns'

interface LocationItem {
  id: string
  name: string
}

interface Selection {
  roomId: string
  startTime: string
  endTime: string
}

interface BookingSlot {
  id: string
  sourceBookingId: string
  roomId: string
  userId: string
  startTime: string
  endTime: string
  isRecurring: boolean
  dayOfWeek: number | null
  title: string | null
}

definePageMeta({
  layout: 'default',
  title: 'Reservas',
})

const route = useRoute()
const router = useRouter()
const { isAdmin, isOwner } = useRole()
const { user } = useUser()
const toast = useToast()

const selectedDate = ref(new Date())
const selectedLocationId = ref(String(route.params.locationId || ''))
const isModalOpen = ref(false)
const modalMode = ref<'create' | 'release'>('create')
const selectedSelection = ref<Selection | null>(null)
const selectedBooking = ref<BookingSlot | null>(null)

const canCreateRecurring = computed(() => isAdmin.value || isOwner.value)
const canReleaseAnyRecurring = computed(() => isAdmin.value || isOwner.value)
const currentUserId = computed(() => user.value?.id || '')

const from = computed(() => format(selectedDate.value, 'yyyy-MM-dd'))
const to = computed(() => format(selectedDate.value, 'yyyy-MM-dd'))
const currentDayLabel = computed(() => format(selectedDate.value, 'EEEE, dd MMM yyyy'))

const { data: locations } = await useFetch<LocationItem[]>('/api/bookings/locations')

const locationItems = computed(() =>
  (locations.value || []).map((location) => ({ label: location.name, value: location.id })),
)

const { data: bookingData, refresh: refreshBookings } = await useFetch('/api/bookings', {
  query: computed(() => ({
    locationId: selectedLocationId.value,
    from: from.value,
    to: to.value,
  })),
})

watch(
  () => route.params.locationId,
  (locationId) => {
    selectedLocationId.value = String(locationId || '')
  },
)

function changeDay(days: number) {
  selectedDate.value = addDays(selectedDate.value, days)
}

function handleLocationChange(value: string) {
  if (!value || value === String(route.params.locationId || '')) {
    return
  }

  router.push(`/bookings/${value}`)
}

function openCreate(selection: Selection) {
  selectedSelection.value = selection
  selectedBooking.value = null
  modalMode.value = 'create'
  isModalOpen.value = true
}

function openBooked(booking: BookingSlot) {
  if (!booking?.isRecurring) {
    return
  }

  const canRelease = canReleaseAnyRecurring.value || booking.userId === currentUserId.value

  if (!canRelease) {
    toast.add({
      title: 'No puedes liberar esta reserva',
      description: 'Solo puedes liberar reservas recurrentes propias.',
      color: 'warning',
    })
    return
  }

  selectedBooking.value = booking
  selectedSelection.value = null
  modalMode.value = 'release'
  isModalOpen.value = true
}

watch(
  () => bookingData.value,
  () => {
    if (!selectedLocationId.value && locations.value?.length) {
      selectedLocationId.value = locations.value[0]!.id
    }
  },
)

watch(
  () => [from.value, to.value, selectedLocationId.value],
  () => {
    if (!selectedLocationId.value) {
      return
    }

    refreshBookings().catch((error) => {
      toast.add({
        title: 'No se pudieron cargar las reservas',
        description: error?.data?.message || error?.message || 'Intenta nuevamente.',
        color: 'error',
      })
    })
  },
)
</script>
