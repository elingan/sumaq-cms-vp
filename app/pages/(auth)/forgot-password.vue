<template>
  <UAuthForm
    v-if="!submitted"
    :schema="schema"
    :fields="fields"
    :title="t('auth.forgotPasswordTitle')"
    :description="t('auth.forgotPasswordDescription')"
    icon="i-lucide-mail"
    :submit="{ label: t('auth.sendResetLink'), block: true, loading }"
    @submit="onSubmit"
  >
    <template v-if="error" #validation>
      <UAlert color="error" icon="i-lucide-alert-circle" :title="error" />
    </template>

    <template #footer>
      <ULink to="/login" class="text-primary font-medium">{{ t('auth.backToLogin') }}</ULink>
    </template>
  </UAuthForm>

  <div v-else class="flex min-h-screen items-center justify-center p-4">
    <UPageCard class="w-full max-w-md">
      <template #title>
        {{ t('auth.forgotPasswordTitle') }}
      </template>

      <template #description>
        {{ t('auth.forgotPasswordSuccess') }}
      </template>

      <div class="space-y-4">
        <UAlert
          color="success"
          icon="i-lucide-mail-check"
          :title="t('auth.forgotPasswordSuccessTitle')"
        />

        <UButton block to="/login" color="primary">
          {{ t('auth.backToLogin') }}
        </UButton>
      </div>
    </UPageCard>
  </div>
</template>

<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'auth' })

const { t } = useI18n()

const schema = z.object({
  email: z.email(t('auth.invalidEmail')),
})

type Schema = z.output<typeof schema>

const fields = computed(() => [
  {
    name: 'email',
    type: 'email' as const,
    label: t('auth.email'),
    placeholder: t('auth.emailPlaceholder'),
    required: true,
  },
])

const loading = ref(false)
const submitted = ref(false)
const error = ref<string | null>(null)

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  loading.value = true
  error.value = null

  try {
    await $fetch('/api/auth/forgot-password', {
      method: 'POST',
      body: payload.data,
    })
    submitted.value = true
  } catch (err: unknown) {
    const e = err as { data?: { message?: string } }
    error.value = e?.data?.message ?? t('auth.forgotPasswordError')
  } finally {
    loading.value = false
  }
}
</script>
