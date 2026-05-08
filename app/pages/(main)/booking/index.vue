<template>
  <div class="flex flex-col gap-2 mb-4">
    <ULink to="/dashboard" class="text-sm text-muted">
      {{ $t('nav.dashboard') }}
    </ULink>
    <ULink to="/calendar/bookings" class="text-sm text-muted"> Booking Calendar </ULink>
    <ULink to="/appointment" class="text-sm text-muted"> Booking Appoitment </ULink>
  </div>
</template>

<script lang="ts" setup></script>

<style></style>
