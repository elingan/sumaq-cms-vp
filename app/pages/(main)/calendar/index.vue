<template>
  <div />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  title: 'Calendario',
  middleware: (to) => {
    if (to.path === '/calendar') {
      return navigateTo('/calendar/bookings', { replace: true })
    }
  },
})
</script>
