<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto p-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Gestión de Contenidos</h1>
        <p class="text-gray-600 mt-2">Selecciona un contenido para editar</p>
      </div>

      <div v-if="pending" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <USkeleton class="h-32 w-full" v-for="i in 3" :key="i" />
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-300 rounded-lg p-4">
        <p class="text-red-800 font-semibold">Error cargando contenidos</p>
        <p class="text-red-700 text-sm mt-2">{{ error }}</p>
      </div>

      <div
        v-else-if="contentTypes && contentTypes.length > 0"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <NuxtLink
          v-for="item in sortedContentTypes"
          :key="`${item.type}.${item.name}`"
          :to="`/cms/${item.type}/${item.name}`"
          class="block"
        >
          <UCard class="hover:shadow-lg transition-shadow cursor-pointer">
            <div class="flex items-center gap-3">
              <div class="flex-shrink-0">
                <UIcon
                  :name="item.type === 'page' ? 'i-lucide-file-text' : 'i-lucide-newspaper'"
                  class="w-8 h-8 text-gray-600"
                />
              </div>
              <div class="flex-1">
                <h3 class="font-semibold text-lg text-gray-900 capitalize">
                  {{ item.name }}
                </h3>
                <p class="text-sm text-gray-500 mt-1">
                  {{ item.type === 'page' ? 'Página' : 'Blog' }}
                </p>
              </div>
              <div class="flex-shrink-0">
                <UIcon name="i-lucide-chevron-right" class="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </UCard>
        </NuxtLink>
      </div>

      <div v-else class="bg-blue-50 border border-blue-300 rounded-lg p-8 text-center">
        <UIcon name="i-lucide-info" class="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <p class="text-blue-800 font-semibold">No hay contenidos disponibles</p>
        <p class="text-blue-700 text-sm mt-2">Agrega archivos .yaml en la carpeta public/cms/</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useContentTypes } from '~/composables/useContentTypes'

definePageMeta({
  layout: 'default',
})

useHead({
  title: 'Gestión de Contenidos - Sumaq CMS',
})

const { contentTypes, pending, error } = useContentTypes()

const sortedContentTypes = computed(() => {
  if (!contentTypes.value) return []
  return [...contentTypes.value].sort((a, b) => {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name)
    }
    return a.type.localeCompare(b.type)
  })
})
</script>
