<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <UApp>
    <UHeader>
      <template #left>
        <NuxtLink to="/">
          <AppLogo class="h-6 w-auto shrink-0" />
        </NuxtLink>
      </template>

      <template #right>
        <UColorModeButton />
        <UButton
          to="/login"
          color="neutral"
          variant="ghost"
          :label="t('nav.login')"
          icon="i-lucide-log-in"
        />
      </template>
    </UHeader>

    <UMain>
      <slot />
    </UMain>

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">Sumaq CMS · © {{ new Date().getFullYear() }}</p>
      </template>
    </UFooter>
  </UApp>
</template>
