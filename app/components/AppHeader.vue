<template>
  <UHeader>
    <template #left>
      <NuxtLink to="/">
        <AppLogo class="h-6 w-auto shrink-0" />
      </NuxtLink>
    </template>

    <template #right>
      <UColorModeButton />
      <LocaleSelector />
      <USeparator
        v-if="loggedIn"
        orientation="vertical"
        type="solid"
        color="neutral"
        class="h-8 ml-4"
        decorative
      />
      <UserMenu v-if="loggedIn" />
    </template>
  </UHeader>
</template>

<script lang="ts" setup>
const { loggedIn } = useUserSession()
</script>

<style></style>
