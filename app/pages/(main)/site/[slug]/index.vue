<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar title="Home" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton icon="i-lucide-plus" size="md" class="rounded-full" />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <p>Toolbar</p>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <p>Aqui el body</p>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'site' })
</script>
