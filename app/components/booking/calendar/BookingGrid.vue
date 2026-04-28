<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-base font-semibold text-highlighted">
          {{ title }}
        </h3>
        <span class="text-sm text-muted">{{ subtitle }}</span>
      </div>
    </template>

    <div class="overflow-x-auto">
      <table class="w-full min-w-[780px] border-separate border-spacing-2">
        <thead>
          <tr>
            <th
              class="w-28 px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted"
            >
              Hora
            </th>
            <th
              v-for="room in rooms"
              :key="room.id"
              class="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted"
            >
              {{ room.name }}
            </th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="hour in hours" :key="hour">
            <td class="px-2 py-1 text-sm text-muted">
              {{ formatHour(hour) }}
            </td>

            <td v-for="room in rooms" :key="`${room.id}-${hour}`" class="p-0">
              <button
                type="button"
                class="slot-cell"
                :class="slotClass(room.id, hour)"
                @click="handleCellClick(room.id, hour)"
              >
                <template v-if="getSlot(room.id, hour)">
                  <div class="text-xs font-medium leading-tight text-inverted">
                    {{ getSlot(room.id, hour)?.title || getSlot(room.id, hour)?.userId }}
                  </div>
                  <div class="mt-1 flex items-center justify-between text-[11px] text-inverted/90">
                    <span>{{ formatHour(hour) }} - {{ formatHour(hour + 1) }}</span>
                    <UIcon
                      v-if="getSlot(room.id, hour)?.isRecurring"
                      name="i-lucide-repeat"
                      class="size-3"
                    />
                  </div>
                </template>

                <template v-else>
                  <div class="text-xs font-medium text-green-800">Disponible</div>
                </template>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { addHours, format, parseISO, startOfDay } from 'date-fns'

interface Room {
  id: string
  name: string
}

export interface BookingSlot {
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
  rooms: Room[]
  bookings: BookingSlot[]
  selectedDate: Date
  startHour?: number
  endHour?: number
}

const props = withDefaults(defineProps<Props>(), {
  startHour: 8,
  endHour: 20,
})

const emit = defineEmits<{
  selectAvailable: [payload: { roomId: string; startTime: string; endTime: string }]
  selectBooked: [slot: BookingSlot]
}>()

const hours = computed(() =>
  Array.from({ length: props.endHour - props.startHour }, (_, i) => props.startHour + i),
)

const title = computed(() => `Reservas del ${format(props.selectedDate, 'dd/MM/yyyy')}`)
const subtitle = computed(() => `${props.rooms.length} sala(s)`)

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

function getSlot(roomId: string, hour: number): BookingSlot | undefined {
  const dayKey = format(props.selectedDate, 'yyyy-MM-dd')

  return props.bookings.find((slot) => {
    if (slot.roomId !== roomId) {
      return false
    }

    const start = parseISO(slot.startTime)
    const slotDay = format(start, 'yyyy-MM-dd')

    return slotDay === dayKey && start.getHours() === hour
  })
}

function slotClass(roomId: string, hour: number): string {
  const slot = getSlot(roomId, hour)

  if (!slot) {
    return 'slot-cell--free'
  }

  return slot.isRecurring ? 'slot-cell--recurring' : 'slot-cell--booked'
}

function handleCellClick(roomId: string, hour: number) {
  const existing = getSlot(roomId, hour)

  if (existing) {
    emit('selectBooked', existing)
    return
  }

  const start = addHours(startOfDay(props.selectedDate), hour)
  const end = addHours(start, 1)

  emit('selectAvailable', {
    roomId,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  })
}
</script>

<style scoped>
.slot-cell {
  height: 4rem;
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid;
  padding: 0.5rem 0.75rem;
  text-align: left;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.slot-cell--free {
  border-color: rgb(187 247 208);
  background-color: rgb(240 253 244);
}

.slot-cell--booked {
  border-color: rgb(252 165 165);
  background-color: rgb(239 68 68);
}

.slot-cell--recurring {
  border-color: rgb(252 211 77);
  background-color: rgb(245 158 11);
  box-shadow: 0 0 0 2px rgb(253 230 138);
}

.slot-cell--free:hover {
  background-color: rgb(220 252 231);
}

.slot-cell--booked:hover {
  background-color: rgb(220 38 38);
}

.slot-cell--recurring:hover {
  background-color: rgb(217 119 6);
}
</style>
