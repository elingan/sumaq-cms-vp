<template>
  <UAuthForm
    :schema="schema"
    :fields="fields"
    :title="t('auth.welcomeBack')"
    :description="t('auth.loginDescription')"
    icon="i-lucide-lock"
    :submit="{ label: t('auth.login'), block: true, loading }"
    @submit="onSubmit"
  >
    <template #password-hint>
      <ULink to="/forgot-password" class="text-primary font-medium">
        {{ t('auth.forgotPassword') }}
      </ULink>
    </template>

    <template v-if="error" #validation>
      <UAlert color="error" icon="i-lucide-info" :title="error" />
    </template>

    <template #footer>
      {{ t('auth.termsPrefix') }}
      <ULink to="/terms" class="text-primary font-medium">{{ t('auth.termsLink') }} </ULink>
    </template>
  </UAuthForm>
</template>

<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'auth' })

const { t } = useI18n()

const schema = z.object({
  email: z.email(t('auth.invalidEmail')),
  password: z.string().min(8, t('auth.passwordMin')),
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
  {
    name: 'password',
    label: t('auth.password'),
    type: 'password' as const,
    placeholder: t('auth.passwordPlaceholder'),
    required: true,
  },
  {
    name: 'remember',
    type: 'checkbox',
    label: 'Remember me',
    description: 'You will be logged in for 30 days.',
  },
])

const error = ref<string | null>(null)
const loading = ref(false)

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  error.value = null
  loading.value = true

  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: payload.data,
    })
    await navigateTo('/dashboard')
  } catch (err: unknown) {
    const e = err as { statusCode?: number }
    error.value = e?.statusCode === 401 ? t('auth.invalidCredentials') : t('auth.loginError')
  } finally {
    loading.value = false
  }
}
</script>
