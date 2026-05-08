<template>
  <div class="flex flex-col items-center justify-center min-h-screen px-4">
    <div class="w-full max-w-md">
      <div class="mb-8 text-center">
        <h1 class="text-3xl font-bold mb-2">
          {{ t('auth.createAccount') }}
        </h1>
        <p class="text-muted">
          {{ t('auth.signupDescription') }}
        </p>
      </div>

      <SignUp />

      <div class="mt-6 border-t pt-6">
        <p class="text-sm text-muted text-center">
          {{ t('auth.termsPrefix') }}
          <ULink to="/terms" class="text-primary font-medium">{{ t('auth.termsLink') }}</ULink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { t } = useI18n()
</script>
