<template>
  <UModal
    :open="open"
    :title="isEditing ? $t('bookingCalendar.editRoomTitle') : $t('bookingCalendar.newRoomTitle')"
    @update:open="$emit('update:open', $event)"
  >
    <template #body>
      <UForm :state="form" :schema="schema" class="space-y-4" @submit="handleSubmit">
        <UFormField :label="$t('bookingCalendar.roomNameLabel')" name="name" required>
          <UInput
            v-model="form.name"
            :placeholder="$t('bookingCalendar.roomNamePlaceholder')"
            class="w-full"
          />
        </UFormField>

        <div class="flex justify-end gap-3 pt-2">
          <UButton
            color="neutral"
            variant="soft"
            :label="t('actions.cancel')"
            @click="$emit('update:open', false)"
          />
          <UButton
            type="submit"
            :loading="isSaving"
            :label="
              isEditing
                ? $t('bookingCalendar.saveChangesButton')
                : $t('bookingCalendar.createRoomButton')
            "
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { z } from 'zod'

interface RoomData {
  id: string
  name: string
}

const props = defineProps<{
  open: boolean
  locationId: string
  room?: RoomData
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()

const isEditing = computed(() => !!props.room)

const schema = z.object({
  name: z.string().min(1, $t('bookingCalendar.validationNameRequired')),
})

const form = reactive({
  name: '',
})

watch(
  () => props.room,
  (r) => {
    form.name = r?.name ?? ''
  },
  { immediate: true },
)

const isSaving = ref(false)

async function handleSubmit() {
  isSaving.value = true
  try {
    if (isEditing.value && props.room) {
      await $fetch(`/api/bookings/locations/${props.locationId}/rooms/${props.room.id}`, {
        method: 'PATCH',
        body: { name: form.name },
      })
    } else {
      await $fetch(`/api/bookings/locations/${props.locationId}/rooms`, {
        method: 'POST',
        body: { name: form.name },
      })
    }
    emit('update:open', false)
    emit('saved')
    toast.add({
      title: isEditing.value
        ? $t('bookingCalendar.roomUpdatedToast')
        : $t('bookingCalendar.roomCreatedToast'),
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
  } catch {
    toast.add({
      title: $t('bookingCalendar.roomSaveErrorToast'),
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    isSaving.value = false
  }
}
</script>
