<script setup lang="ts">
definePageMeta({ layout: 'site' })

const route = useRoute()
const schemaName = computed(() => route.params.name as string)

useHead(() => ({
  title: `${schemaName.value} — Collection Editor`,
}))
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="schemaName">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6">
        <UAlert
          icon="i-lucide-hammer"
          color="info"
          variant="subtle"
          title="Editor pending"
          description="La ruta ya esta reservada para el editor de colecciones basado en el schema CMS."
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
