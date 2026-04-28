<template>
  <UModal
    :open="open"
    :title="
      isEditing ? t('bookingManager.editLocationTitle') : t('bookingManager.newLocationTitle')
    "
    @update:open="$emit('update:open', $event)"
  >
    <template #body>
      <UForm :state="form" :schema="schema" class="space-y-4" @submit="handleSubmit">
        <UFormField :label="t('bookingManager.nameLabel')" name="name" required>
          <UInput
            v-model="form.name"
            :placeholder="t('bookingManager.locationNamePlaceholder')"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('bookingManager.addressLabel')" name="address">
          <UInput
            v-model="form.address"
            :placeholder="t('bookingManager.locationAddressPlaceholder')"
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
                ? t('bookingManager.saveChangesButton')
                : t('bookingManager.createLocationButton')
            "
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { z } from 'zod'

interface LocationData {
  id: string
  name: string
  address: string | null
}

const props = defineProps<{
  open: boolean
  location?: LocationData
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()

const isEditing = computed(() => !!props.location)

const schema = z.object({
  name: z.string().min(1, t('bookingManager.validationNameRequired')),
  address: z.string().optional(),
})

const form = reactive({
  name: '',
  address: '',
})

watch(
  () => props.location,
  (loc) => {
    form.name = loc?.name ?? ''
    form.address = loc?.address ?? ''
  },
  { immediate: true },
)

const isSaving = ref(false)

async function handleSubmit() {
  isSaving.value = true
  try {
    if (isEditing.value && props.location) {
      await $fetch(`/api/bookings/locations/${props.location.id}`, {
        method: 'PATCH',
        body: { name: form.name, address: form.address || undefined },
      })
    } else {
      await $fetch('/api/bookings/locations', {
        method: 'POST',
        body: { name: form.name, address: form.address || undefined },
      })
    }
    emit('update:open', false)
    emit('saved')
    toast.add({
      title: isEditing.value
        ? t('bookingManager.locationUpdatedToast')
        : t('bookingManager.locationCreatedToast'),
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
  } catch {
    toast.add({
      title: t('bookingManager.locationSaveErrorToast'),
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    isSaving.value = false
  }
}
</script>
