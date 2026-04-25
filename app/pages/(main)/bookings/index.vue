<script setup lang="ts">
const { isAdmin, isOwner } = useRole()
const toast = useToast()

const canBootstrap = computed(() => isAdmin.value || isOwner.value)

const {
  data: locations,
  status,
  refresh: refreshLocations,
} = await useFetch<Array<{ id: string }>>('/api/bookings/locations')

if (locations.value?.length) {
  await navigateTo(`/bookings/${locations.value[0]!.id}`)
}

async function handleBootstrap() {
  try {
    await $fetch('/api/bookings/bootstrap', { method: 'POST' })
    await refreshLocations()

    if (locations.value?.length) {
      await navigateTo(`/bookings/${locations.value[0]!.id}`)
      return
    }

    toast.add({
      title: 'Se inicializaron las sedes, pero no se encontraron resultados',
      color: 'warning',
    })
  } catch (error: any) {
    toast.add({
      title: 'No se pudo inicializar sedes y salas',
      description: error?.data?.message || error?.message || 'Intenta nuevamente.',
      color: 'error',
    })
  }
}
</script>

<template>
  <UPage>
    <UPageSection>
      <div v-if="status === 'pending'" class="text-sm text-muted">Cargando sedes...</div>

      <div v-else-if="!locations?.length" class="space-y-3">
        <p class="text-sm text-muted">No hay sedes configuradas para reservas.</p>
        <UButton
          v-if="canBootstrap"
          icon="i-lucide-wand-sparkles"
          label="Inicializar sedes y salas"
          @click="handleBootstrap"
        />
      </div>
    </UPageSection>
  </UPage>
</template>
