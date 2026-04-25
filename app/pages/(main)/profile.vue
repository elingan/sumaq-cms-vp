<template>
  <UPage>
    <UPageBody class="flex items-center justify-center">
      <ClientOnly>
        <UserProfile routing="hash" />
        <template #fallback>
          <USkeleton class="h-160 w-full rounded-xl" />
        </template>
      </ClientOnly>
    </UPageBody>
  </UPage>
</template>
