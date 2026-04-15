<template>
  <div v-if="submitted" class="p-4">
    <UPageCard class="w-full max-w-md">
      <template #title>
        {{ t('auth.resetPasswordSuccessTitle') }}
      </template>

      <template #description>
        {{ t('auth.resetPasswordSuccess') }}
      </template>

      <div class="space-y-4">
        <UAlert color="success" icon="i-lucide-badge-check" :title="t('auth.resetPasswordDone')" />

        <UButton block to="/login">
          {{ t('auth.backToLogin') }}
        </UButton>
      </div>
    </UPageCard>
    <div class="mt-4 text-center">
      <ULink to="/login" class="text-primary font-medium">{{ t('auth.backToLogin') }}</ULink>
    </div>
  </div>

  <div v-else-if="tokenError" class="p-4">
    <UPageCard class="w-full max-w-md">
      <template #title>
        {{ pageTitle }}
      </template>

      <template #description>
        {{ pageDescription }}
      </template>

      <div class="space-y-4">
        <UAlert color="error" icon="i-lucide-circle-alert" :title="tokenError" />

        <UButton block color="neutral" variant="ghost" to="/forgot-password">
          {{ t('auth.requestAnotherLink') }}
        </UButton>
      </div>
      <!-- <template #footer>
      </template> -->
    </UPageCard>
    <div class="mt-4 text-center">
      <ULink to="/login" class="text-primary font-medium">{{ t('auth.backToLogin') }}</ULink>
    </div>
  </div>

  <UAuthForm
    v-else
    :schema="schema"
    :fields="fields"
    :title="pageTitle"
    :description="pageDescription"
    icon="i-lucide-lock"
    :submit="{ label: submitLabel, block: true, loading }"
    @submit="onSubmit"
  >
    <template v-if="error" #validation>
      <UAlert color="error" icon="i-lucide-alert-circle" :title="error" />
    </template>

    <template #footer>
      <ULink to="/login" class="text-primary font-medium">{{ t('auth.backToLogin') }}</ULink>
    </template>
  </UAuthForm>
</template>

<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'auth' })

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

type TokenMeta = {
  purpose: 'invite' | 'reset'
  expiresAt: string
}

const loading = ref(false)
const submitted = ref(false)
const error = ref<string | null>(null)
const tokenError = ref<string | null>(null)
const tokenMeta = ref<TokenMeta | null>(null)

const fields = computed(() => [
  {
    name: 'password',
    type: 'password' as const,
    label: t('auth.password'),
    placeholder: t('auth.passwordPlaceholder'),
    required: true,
  },
  {
    name: 'confirmPassword',
    type: 'password' as const,
    label: t('auth.confirmPassword'),
    placeholder: t('auth.passwordPlaceholder'),
    required: true,
  },
])

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

const submitLabel = computed(() =>
  tokenMeta.value?.purpose === 'invite' ? t('auth.setPassword') : t('auth.resetPassword'),
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
