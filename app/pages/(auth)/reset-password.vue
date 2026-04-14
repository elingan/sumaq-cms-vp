<template>
  <div class="flex min-h-screen items-center justify-center p-4">
    <UPageCard class="w-full max-w-md">
      <template #title>
        {{ submitted ? t('auth.resetPasswordSuccessTitle') : pageTitle }}
      </template>

      <template #description>
        {{ submitted ? t('auth.resetPasswordSuccess') : pageDescription }}
      </template>

      <div v-if="submitted" class="space-y-4">
        <UAlert color="success" icon="i-lucide-badge-check" :title="t('auth.resetPasswordDone')" />

        <UButton block to="/login">
          {{ t('auth.backToLogin') }}
        </UButton>
      </div>

      <div v-else-if="tokenError" class="space-y-4">
        <UAlert color="error" icon="i-lucide-circle-alert" :title="tokenError" />

        <UButton block color="neutral" variant="ghost" to="/forgot-password">
          {{ t('auth.requestAnotherLink') }}
        </UButton>
      </div>

      <UForm v-else :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UAlert v-if="error" color="error" icon="i-lucide-alert-circle" :title="error" />

        <UFormField :label="t('auth.password')" name="password" required>
          <UInput v-model="state.password" type="password" class="w-full" />
        </UFormField>

        <UFormField :label="t('auth.confirmPassword')" name="confirmPassword" required>
          <UInput v-model="state.confirmPassword" type="password" class="w-full" />
        </UFormField>

        <div class="space-y-3 pt-2">
          <UButton type="submit" block :loading="loading">
            {{ tokenMeta?.purpose === 'invite' ? t('auth.setPassword') : t('auth.resetPassword') }}
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
const route = useRoute()

const token = computed(() => {
  const value = route.query.token
  return typeof value === 'string' ? value : ''
})

const schema = z
  .object({
    password: z.string().min(8, t('auth.passwordMin')),
    confirmPassword: z.string().min(8, t('auth.passwordMin')),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: t('auth.passwordsMustMatch'),
    path: ['confirmPassword'],
  })

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  password: '',
  confirmPassword: '',
})

const loading = ref(false)
const submitted = ref(false)
const error = ref<string | null>(null)
const tokenError = ref<string | null>(null)
const tokenMeta = ref<{ purpose: 'invite' | 'reset'; expiresAt: string } | null>(null)

const pageTitle = computed(() =>
  tokenMeta.value?.purpose === 'invite'
    ? t('auth.setInitialPasswordTitle')
    : t('auth.resetPasswordTitle'),
)

const pageDescription = computed(() =>
  tokenMeta.value?.purpose === 'invite'
    ? t('auth.setInitialPasswordDescription')
    : t('auth.resetPasswordDescription'),
)

if (!token.value) {
  tokenError.value = t('auth.invalidResetLink')
} else {
  try {
    tokenMeta.value = await $fetch('/api/auth/reset-password', {
      query: { token: token.value },
    })
  } catch {
    tokenError.value = t('auth.invalidResetLink')
  }
}

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  if (!token.value) {
    tokenError.value = t('auth.invalidResetLink')
    return
  }

  loading.value = true
  error.value = null

  try {
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: {
        token: token.value,
        password: payload.data.password,
      },
    })
    submitted.value = true
  } catch (err: unknown) {
    const e = err as { data?: { message?: string } }
    error.value = e?.data?.message ?? t('auth.resetPasswordError')
  } finally {
    loading.value = false
  }
}
</script>
