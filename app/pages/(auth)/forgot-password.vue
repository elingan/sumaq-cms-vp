<template>
  <div class="flex min-h-screen items-center justify-center p-4">
    <UPageCard class="w-full max-w-md">
      <template #title>
        {{ t('auth.forgotPasswordTitle') }}
      </template>

      <template #description>
        {{ submitted ? t('auth.forgotPasswordSuccess') : t('auth.forgotPasswordDescription') }}
      </template>

      <div v-if="submitted" class="space-y-4">
        <UAlert
          color="success"
          icon="i-lucide-mail-check"
          :title="t('auth.forgotPasswordSuccessTitle')"
        />

        <UButton block to="/login" color="primary">
          {{ t('auth.backToLogin') }}
        </UButton>
      </div>

      <UForm v-else :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UAlert v-if="error" color="error" icon="i-lucide-alert-circle" :title="error" />

        <UFormField :label="t('auth.email')" name="email" required>
          <UInput v-model="state.email" type="email" class="w-full" />
        </UFormField>

        <div class="space-y-3 pt-2">
          <UButton type="submit" block :loading="loading">
            {{ t('auth.sendResetLink') }}
          </UButton>

          <UButton block color="neutral" variant="ghost" to="/login">
            {{ t('auth.backToLogin') }}
          </UButton>
        </div>
      </UForm>
    </UPageCard>
  </div>
</template>

<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'default' })

const { t } = useI18n()

const schema = z.object({
  email: z.email(t('auth.invalidEmail')),
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  email: '',
})

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
