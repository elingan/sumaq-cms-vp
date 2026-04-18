<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto p-8">
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">{{ blogTitle }}</h1>
          <p class="text-gray-600 mt-2">Gestiona las entradas del blog</p>
        </div>
        <div class="flex gap-2">
          <UButton variant="solid" icon="i-lucide-plus" :to="`/cms/blog/${name}/new`">
            Crear Nuevo
          </UButton>
          <UButton variant="ghost" icon="i-lucide-arrow-left" to="/content" />
        </div>
      </div>

      <div v-if="pending" class="space-y-4">
        <USkeleton class="h-24 w-full" v-for="i in 3" :key="i" />
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-300 rounded-lg p-4">
        <p class="text-red-800 font-semibold">Error cargando entradas</p>
        <p class="text-red-700 text-sm mt-2">{{ error }}</p>
      </div>

      <div v-else-if="entries && entries.length > 0" class="space-y-4">
        <NuxtLink
          v-for="entry in entries"
          :key="entry.slug"
          :to="`/cms/blog/${name}/${entry.slug}`"
          class="block"
        >
          <UCard class="hover:shadow-lg transition-shadow cursor-pointer">
            <div class="flex items-start gap-4">
              <div v-if="entry.content?.image" class="flex-shrink-0">
                <img
                  :src="entry.content.image"
                  :alt="entry.meta?.title"
                  class="w-24 h-24 object-cover rounded"
                />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1">
                    <h3 class="font-semibold text-lg text-gray-900">
                      {{ entry.meta?.title || 'Sin título' }}
                    </h3>
                    <p class="text-sm text-gray-500 mt-1">{{ entry.slug }}</p>
                    <p v-if="entry.content?.excerpt" class="text-gray-600 mt-2 line-clamp-2">
                      {{ entry.content.excerpt }}
                    </p>
                  </div>
                  <div class="flex-shrink-0 text-right">
                    <p class="text-sm text-gray-500">
                      {{ formatDate(entry.meta?.date) }}
                    </p>
                    <div class="mt-2">
                      <UBadge :color="entry.meta?.published ? 'green' : 'gray'" variant="subtle">
                        {{ entry.meta?.published ? 'Publicado' : 'Borrador' }}
                      </UBadge>
                    </div>
                  </div>
                </div>
                <div v-if="entry.seo?.tags?.length" class="mt-3 flex flex-wrap gap-2">
                  <UBadge
                    v-for="tag in entry.seo.tags"
                    :key="tag"
                    color="blue"
                    variant="subtle"
                    size="xs"
                  >
                    {{ tag }}
                  </UBadge>
                </div>
              </div>
              <div class="flex-shrink-0">
                <UIcon name="i-lucide-chevron-right" class="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </UCard>
        </NuxtLink>
      </div>

      <div v-else class="bg-blue-50 border border-blue-300 rounded-lg p-8 text-center">
        <UIcon name="i-lucide-file-plus" class="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <p class="text-blue-800 font-semibold">No hay entradas</p>
        <p class="text-blue-700 text-sm mt-2">Crea tu primera entrada de blog</p>
        <UButton class="mt-4" icon="i-lucide-plus" :to="`/cms/blog/${name}/new`">
          Crear Primera Entrada
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const route = useRoute()
const name = computed(() => route.params.name as string)

const blogTitle = computed(() => {
  return `Blog: ${name.value.charAt(0).toUpperCase() + name.value.slice(1)}`
})

useHead({
  title: () => `${blogTitle.value} - Sumaq CMS`,
})

const {
  data: entries,
  pending,
  error,
} = await useAsyncData(`blog-${name.value}`, () => $fetch(`/api/cms/blog/${name.value}`))

const formatDate = (date: string) => {
  if (!date) return 'Sin fecha'
  return new Date(date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
</script>
