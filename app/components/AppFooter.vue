<template>
  <USeparator icon="i-simple-icons-nuxtdotjs" />

  <UFooter>
    <template #left>
      <p class="text-sm text-muted">
        {{ $t('app.builtWith', { year: new Date().getFullYear() }) }}
      </p>
    </template>

    <template #right>
      <p>{{ $t('app.name') }}</p>
    </template>
  </UFooter>
</template>

<script lang="ts" setup></script>

<style></style>
