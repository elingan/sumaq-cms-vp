<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <div class="sticky top-0 z-10 bg-white border-b border-gray-300 p-4 shadow-sm">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">{{ pageTitle }}</h1>
          <p class="text-sm text-gray-600 mt-1">
            {{ name }} / {{ isNew ? 'nueva entrada' : slug }}
          </p>
        </div>
        <div class="flex gap-2">
          <UButton
            :variant="showPreview ? 'solid' : 'ghost'"
            icon="i-lucide-eye"
            @click="showPreview = !showPreview"
          >
            {{ showPreview ? 'Ocultar' : 'Mostrar' }} Preview
          </UButton>
          <UButton variant="ghost" size="lg" icon="i-lucide-arrow-left" :to="`/cms/blog/${name}`" />
        </div>
      </div>
    </div>

    <div class="flex-1 flex overflow-hidden">
      <!-- Editor Panel -->
      <div :class="['overflow-auto transition-all duration-300', showPreview ? 'w-1/2' : 'w-full']">
        <div class="max-w-4xl mx-auto p-8">
          <div v-if="loading" class="space-y-4">
            <USkeleton class="h-12 w-full" />
            <USkeleton class="h-64 w-full" />
            <USkeleton class="h-12 w-full" />
          </div>

          <div v-else-if="error" class="bg-red-50 border border-red-300 rounded-lg p-4">
            <p class="text-red-800 font-semibold">Error cargando el editor</p>
            <p class="text-red-700 text-sm mt-2">{{ error }}</p>
          </div>

          <EditorDynamicForm
            v-if="!loading && !error && Object.keys(schema).length > 0"
            :schema="schema"
            :initial-data="contentData"
            :on-save="handleSave"
          />
        </div>
      </div>

      <!-- Preview Panel -->
      <div v-if="showPreview" class="w-1/2 border-l border-gray-300 overflow-hidden bg-white p-8">
        <div class="max-w-2xl mx-auto">
          <article class="prose prose-lg">
            <h1>{{ contentData.meta?.title || 'Sin título' }}</h1>
            <div class="text-sm text-gray-500 mb-4">
              <p>{{ formatDate(contentData.meta?.date) }} • {{ contentData.meta?.author }}</p>
            </div>
            <img
              v-if="contentData.content?.image"
              :src="contentData.content.image"
              :alt="contentData.meta?.title"
              class="w-full rounded-lg"
            />
            <p v-if="contentData.content?.excerpt" class="lead">
              {{ contentData.content.excerpt }}
            </p>
            <div v-if="contentData.content?.body" v-html="contentData.content.body"></div>
          </article>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import DynamicForm from '~/components/Editor/DynamicForm.vue'

definePageMeta({
  layout: 'editor',
})

const route = useRoute()
const router = useRouter()
const name = computed(() => route.params.name as string)
const slug = computed(() => route.params.slug as string)
const isNew = computed(() => slug.value === 'new')

const pageTitle = computed(() => {
  return isNew.value ? 'Nueva Entrada' : 'Editar Entrada'
})

useHead({
  title: () => `${pageTitle.value} - ${name.value} - Sumaq CMS`,
})

const loading = ref(true)
const error = ref('')
const showPreview = ref(false)
const schema = ref<Record<string, any>>({})
const contentData = reactive<Record<string, any>>({})

onMounted(async () => {
  try {
    // Cargar schema y data desde API
    const response = await $fetch(`/api/cms/blog/${name.value}/${slug.value}`)

    // Asignar schema y data
    schema.value = response.schema
    Object.assign(contentData, response.data)

    loading.value = false
  } catch (err) {
    error.value = `Error al cargar el contenido: ${err instanceof Error ? err.message : String(err)}`
    loading.value = false
  }
})

const handleSave = async (data: Record<string, any>) => {
  try {
    const method = isNew.value ? 'POST' : 'PUT'

    // Guardar vía API
    const response = await $fetch(`/api/cms/blog/${name.value}/${slug.value}`, {
      method,
      body: data,
    })

    // Actualizar datos locales
    Object.assign(contentData, data)

    // Si es nueva entrada, redirigir al editor de la entrada creada
    if (isNew.value && response.slug) {
      await router.push(`/cms/blog/${name.value}/${response.slug}`)
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
    throw new Error(`Error al guardar: ${errorMessage}`)
  }
}

const formatDate = (date: string) => {
  if (!date) return 'Sin fecha'
  return new Date(date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
</script>
