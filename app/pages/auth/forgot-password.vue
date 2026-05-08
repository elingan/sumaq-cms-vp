<template>
  <div class="flex flex-col items-center justify-center min-h-screen px-4">
    <UPageCard class="w-full max-w-md">
      <template #title>
        {{ t('auth.forgotPasswordTitle') }}
      </template>

      <template #description>
        {{ t('auth.forgotPasswordDescription') }}
      </template>

      <div class="space-y-4">
        <UAlert
          color="info"
          icon="i-lucide-info"
          title="Password recovery is managed by Clerk"
          description="You can reset your password by clicking 'Forgot password' on the login page."
        />

        <UButton block to="/auth/login" color="primary">
          {{ t('auth.backToLogin') }}
        </UButton>
      </div>
    </UPageCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { t } = useI18n()
</script>
