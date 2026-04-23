<template>
  <UPageHeader :title="title" :description="description" :ui="ui" />
</template>

<script lang="ts" setup>
defineProps<{
  title: string
  description?: string
}>()

const ui = {
  root: 'w-full max-w-(--ui-container) mx-auto border-none py-4',
  container: 'px-4 sm:px-6 lg:px-8 ',
  description: 'mt-0',
}
</script>
