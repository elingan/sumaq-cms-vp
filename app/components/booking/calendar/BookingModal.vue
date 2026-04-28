<template>
  <UModal v-model:open="isOpen" :title="modalTitle" :description="modalDescription">
    <template #body>
      <div v-if="mode === 'create'" class="space-y-4">
        <UFormField label="Sala" name="roomId">
          <USelect v-model="state.roomId" :items="roomItems" />
        </UFormField>

        <div class="grid grid-cols-2 gap-3">
          <UFormField label="Inicio" name="startTime">
            <UInput :model-value="formattedStart" readonly />
          </UFormField>

          <UFormField label="Fin" name="endTime">
            <UInput :model-value="formattedEnd" readonly />
          </UFormField>
        </div>

        <UFormField label="Titulo" name="title">
          <UInput v-model="state.title" placeholder="Ej. Terapia ocupacional" />
        </UFormField>

        <UCheckbox
          v-if="canCreateRecurring"
          v-model="state.isRecurring"
          label="Reserva recurrente"
          description="Bloquea este mismo horario cada semana"
        />
      </div>

      <div v-else class="space-y-3">
        <UAlert
          color="warning"
          icon="i-lucide-triangle-alert"
          title="Liberar turno recurrente"
          description="Esta accion solo libera esta fecha. El resto de semanas siguen reservadas."
        />

        <div class="rounded-lg border border-default px-3 py-2 text-sm text-default">
          <p><strong>Sala:</strong> {{ releaseRoomName }}</p>
          <p><strong>Fecha:</strong> {{ releaseDate }}</p>
          <p><strong>Horario:</strong> {{ releaseTimeRange }}</p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="subtle" @click="isOpen = false">Cancelar</UButton>
        <UButton
          :color="mode === 'release' ? 'warning' : 'primary'"
          :loading="submitting"
          @click="handleSubmit"
        >
          {{ mode === 'release' ? 'Liberar' : 'Reservar' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { format, parseISO } from 'date-fns'

interface Room {
  id: string
  name: string
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

interface Props {
  open: boolean
  mode: 'create' | 'release'
  rooms: Room[]
  selection?: {
    roomId: string
    startTime: string
    endTime: string
  } | null
  booking?: BookingSlot | null
  canCreateRecurring?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selection: null,
  booking: null,
  canCreateRecurring: false,
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: []
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})

const state = reactive({
  roomId: '',
  title: '',
  isRecurring: false,
})

const submitting = ref(false)

const roomItems = computed(() => props.rooms.map((room) => ({ label: room.name, value: room.id })))

const formattedStart = computed(() => {
  if (!props.selection?.startTime) return ''
  return format(parseISO(props.selection.startTime), 'dd/MM/yyyy HH:mm')
})

const formattedEnd = computed(() => {
  if (!props.selection?.endTime) return ''
  return format(parseISO(props.selection.endTime), 'HH:mm')
})

const modalTitle = computed(() =>
  props.mode === 'create' ? 'Nueva reserva' : 'Liberar sala para este dia',
)

const modalDescription = computed(() =>
  props.mode === 'create'
    ? 'Confirma la sala y horario para crear la reserva.'
    : 'Esta accion creara una excepcion de disponibilidad para la fecha seleccionada.',
)

const releaseRoomName = computed(() => {
  if (!props.booking) return '-'
  return props.rooms.find((room) => room.id === props.booking?.roomId)?.name || props.booking.roomId
})

const releaseDate = computed(() => {
  if (!props.booking) return '-'
  return format(parseISO(props.booking.startTime), 'dd/MM/yyyy')
})

const releaseTimeRange = computed(() => {
  if (!props.booking) return '-'
  const start = format(parseISO(props.booking.startTime), 'HH:mm')
  const end = format(parseISO(props.booking.endTime), 'HH:mm')
  return `${start} - ${end}`
})

watch(
  () => props.selection,
  (selection) => {
    if (!selection) return
    state.roomId = selection.roomId
    state.isRecurring = false
    state.title = ''
  },
  { immediate: true },
)

async function handleSubmit() {
  submitting.value = true

  try {
    if (props.mode === 'create' && props.selection) {
      await $fetch('/api/bookings', {
        method: 'POST',
        body: {
          roomId: state.roomId,
          startTime: props.selection.startTime,
          endTime: props.selection.endTime,
          isRecurring: state.isRecurring,
          title: state.title || undefined,
        },
      })
    }

    if (props.mode === 'release' && props.booking) {
      await $fetch('/api/bookings/release', {
        method: 'POST',
        body: {
          bookingId: props.booking.sourceBookingId,
          exceptionDate: format(parseISO(props.booking.startTime), 'yyyy-MM-dd'),
        },
      })
    }

    emit('saved')
    isOpen.value = false
  } finally {
    submitting.value = false
  }
}
</script>
