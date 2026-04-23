<template>
  <div class="h-screen flex flex-col items-center justify-between px-4">
    <!-- <UButton
      icon="i-lucide-chevron-left"
      to="/"
      size="xl"
      color="neutral"
      variant="subtle"
      class="absolute left-8 top-8 rounded-full z-10"
    /> -->
    <div class="max-w-sm w-full pt-8 flex items-center justify-center">
      <AppLogo class="h-6 w-auto shrink-0" />
    </div>
    <div class="absolute top-6 right-6 flex items-center gap-4">
      <UColorModeButton />
      <LocaleSelector />
    </div>

    <slot />
    <!-- <UPageCard variant="subtle" class="max-w-sm w-full">
    </UPageCard> -->

    <div class="max-w-sm w-full pb-8">
      <p class="text-sm text-muted text-center">
        {{ $t('app.builtWith', { year: new Date().getFullYear() }) }}
      </p>
    </div>
  </div>
</template>
