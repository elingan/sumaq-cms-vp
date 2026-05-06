<template>
  <div>
    <UPage>
      <UPageHeader
        :title="t('appointments.pageTitle')"
        :description="t('appointments.pageDescription')"
      >
        <template #links>
          <UButton
            icon="i-lucide-plus"
            color="primary"
            :label="t('actions.createAppointment')"
            :disabled="pendingCapabilities || !canCreateAppointment"
            @click="openCreate"
          />
        </template>
      </UPageHeader>

      <UPageBody>
        <div v-if="pendingCapabilities" class="flex justify-center py-12">
          <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted" />
        </div>

        <UAlert
          v-else-if="capabilitiesError"
          color="error"
          variant="soft"
          :title="t('appointments.capabilitiesErrorTitle')"
          :description="
            capabilitiesError.data?.message ?? t('appointments.capabilitiesErrorDescription')
          "
        />

        <UEmpty
          v-else-if="appointments.length === 0"
          :title="t('appointments.emptyTitle')"
          :description="t('appointments.emptyDescription')"
          variant="soft"
        >
          <template #default>
            <UButton
              icon="i-lucide-plus"
              color="primary"
              :label="t('actions.createAppointment')"
              :disabled="!canCreateAppointment"
              @click="openCreate"
            />
          </template>
        </UEmpty>

        <div v-else class="space-y-3">
          <UCard v-for="appointment in appointments" :key="appointment.id">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <h3 class="truncate text-sm font-semibold text-foreground">
                  {{ appointment.title }}
                </h3>
                <p class="mt-1 text-sm text-muted">
                  {{ appointment.scheduledAt }}
                </p>
                <p v-if="appointment.notes" class="mt-2 text-sm text-muted">
                  {{ appointment.notes }}
                </p>
              </div>
            </div>
          </UCard>
        </div>
      </UPageBody>
    </UPage>

    <UModal
      v-model:open="createOpen"
      :title="t('appointments.createModalTitle')"
      :description="t('appointments.createModalDescription')"
    >
      <template #body>
        <UForm :state="form" :schema="schema" class="space-y-4" @submit="handleSubmit">
          <UFormField :label="t('appointments.titleLabel')" name="title" required>
            <UInput v-model="form.title" :placeholder="t('appointments.titlePlaceholder')" />
          </UFormField>

          <UFormField :label="t('appointments.datetimeLabel')" name="scheduledAt" required>
            <UInput v-model="form.scheduledAt" type="datetime-local" />
          </UFormField>

          <UFormField :label="t('appointments.notesLabel')" name="notes">
            <UTextarea v-model="form.notes" :placeholder="t('appointments.notesPlaceholder')" />
          </UFormField>

          <div class="flex justify-end gap-3 pt-2">
            <UButton
              color="neutral"
              variant="soft"
              :label="t('actions.cancel')"
              :disabled="isSaving"
              @click="createOpen = false"
            />
            <UButton
              type="submit"
              :loading="isSaving"
              :label="t('actions.create')"
              :disabled="!canCreateAppointment"
            />
          </div>
        </UForm>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'default', title: 'Citas' })

const { t } = useI18n()
const toast = useToast()

type CapabilitiesResponse = {
  capabilities: Record<string, boolean>
}

const {
  data: capabilitiesData,
  pending: pendingCapabilities,
  error: capabilitiesError,
} = await useFetch<CapabilitiesResponse>('/api/auth/capabilities', {
  query: { module: 'appointments' },
})

const canCreateAppointment = computed(() =>
  Boolean(capabilitiesData.value?.capabilities?.create_appointment),
)

type AppointmentItem = {
  id: string
  title: string
  scheduledAt: string
  notes: string
}

const appointments = ref<AppointmentItem[]>([])

const createOpen = ref(false)
const isSaving = ref(false)

const schema = z.object({
  title: z.string().min(1, t('validation.required')),
  scheduledAt: z.string().min(1, t('validation.required')),
  notes: z.string().optional().default(''),
})

type Schema = z.output<typeof schema>

const form = reactive<Schema>({
  title: '',
  scheduledAt: '',
  notes: '',
})

function resetForm() {
  form.title = ''
  form.scheduledAt = ''
  form.notes = ''
}

function openCreate() {
  if (!canCreateAppointment.value) {
    toast.add({
      title: t('appointments.noPermissionToast'),
      color: 'warning',
      icon: 'i-lucide-shield-alert',
    })
    return
  }

  createOpen.value = true
}

async function handleSubmit(payload: FormSubmitEvent<Schema>) {
  if (!canCreateAppointment.value) {
    toast.add({
      title: t('appointments.noPermissionToast'),
      color: 'warning',
      icon: 'i-lucide-shield-alert',
    })
    return
  }

  isSaving.value = true

  try {
    const id = crypto.randomUUID()
    appointments.value = [
      {
        id,
        title: payload.data.title,
        scheduledAt: payload.data.scheduledAt,
        notes: payload.data.notes,
      },
      ...appointments.value,
    ]
    resetForm()
    createOpen.value = false
    toast.add({
      title: t('appointments.createSuccessToast'),
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
  } catch {
    toast.add({
      title: t('appointments.createErrorToast'),
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    isSaving.value = false
  }
}
</script>
