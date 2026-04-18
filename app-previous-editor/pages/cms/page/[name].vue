<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <div class="sticky top-0 z-10 bg-white border-b border-gray-300 p-4 shadow-sm">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">{{ contentTitle }}</h1>
          <p class="text-sm text-gray-600 mt-1">{{ type }}.{{ name }}</p>
        </div>
        <div class="flex gap-2">
          <UButton
            :variant="showPreview ? 'solid' : 'ghost'"
            icon="i-lucide-eye"
            @click="showPreview = !showPreview"
          >
            {{ showPreview ? 'Ocultar' : 'Mostrar' }} Preview
          </UButton>
          <UButton variant="ghost" size="lg" icon="i-lucide-arrow-left" to="/content" />
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
      <div v-if="showPreview" class="w-1/2 border-l border-gray-300 overflow-hidden">
        <PreviewPanel :data="contentData" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import DynamicForm from '~/components/Editor/DynamicForm.vue'
import PreviewPanel from '~/components/Editor/PreviewPanel.vue'

definePageMeta({
  layout: 'editor',
})

const route = useRoute()
const type = computed(() => 'page')
const name = computed(() => route.params.name as string)

const contentTitle = computed(() => {
  const nameStr = name.value.charAt(0).toUpperCase() + name.value.slice(1)
  return `Editor - ${type.value === 'page' ? 'Página' : 'Blog'}: ${nameStr}`
})

useHead({
  title: () => `${contentTitle.value} - Sumaq CMS`,
})

const loading = ref(true)
const error = ref('')
const showPreview = ref(false)
const schema = ref<Record<string, any>>({})
const contentData = reactive<Record<string, any>>({})

onMounted(async () => {
  // Validar tipo permitido
  if (!['page', 'blog'].includes(type.value)) {
    error.value = 'Tipo de contenido no válido. Solo se permiten "page" o "blog".'
    loading.value = false
    return
  }

  try {
    // Cargar schema y data desde API
    const response = await $fetch(`/api/cms/${type.value}/${name.value}`)

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
    // Guardar vía API
    await $fetch(`/api/cms/${type.value}/${name.value}`, {
      method: 'PUT',
      body: data,
    })

    // Actualizar datos locales
    Object.assign(contentData, data)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
    throw new Error(`Error al guardar: ${errorMessage}`)
  }
}
</script>
