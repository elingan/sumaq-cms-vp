<template>
  <div class="flex flex-col items-center justify-center min-h-screen px-4">
    <UPageCard class="w-full max-w-md">
      <template #title>
        {{ t('auth.resetPasswordTitle') }}
      </template>

      <template #description> Password reset is managed by Clerk </template>

      <div class="space-y-4">
        <UAlert
          color="info"
          icon="i-lucide-info"
          title="Password recovery"
          description="Password resets are handled automatically by Clerk. You will receive an email with instructions if you request a password reset from the login page."
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
