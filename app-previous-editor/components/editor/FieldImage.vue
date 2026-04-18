<template>
  <div>
    <div class="space-y-3">
      <div v-if="preview" class="relative">
        <NuxtImg
          :src="modelValue"
          :alt="`Preview de ${field.label}`"
          class="max-w-xs h-auto rounded-lg border border-gray-300"
        />
      </div>

      <div class="flex gap-2">
        <UInput
          :model-value="modelValue"
          type="url"
          :placeholder="'https://ejemplo.com/imagen.jpg o subir archivo'"
          :error="!!error"
          class="flex-1"
          @update:model-value="$emit('update:modelValue', $event)"
        />

        <UButton
          variant="outline"
          icon="i-lucide-upload"
          :loading="uploading"
          @click="triggerFileInput"
        >
          Subir
        </UButton>
      </div>

      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="hidden"
        @change="handleFileUpload"
      />
    </div>
    <p v-if="error" class="text-red-500 text-sm mt-1">{{ error }}</p>
    <p v-if="uploadError" class="text-red-500 text-sm mt-1">{{ uploadError }}</p>
  </div>
</template>

<script setup lang="ts">
import type { SchemaField } from '~/composables/useSchemaValidator'

defineProps<{
  field: SchemaField
  modelValue: any
  error?: string | null
  preview?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const uploadError = ref<string | null>(null)

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  // Validar que sea una imagen
  if (!file.type.startsWith('image/')) {
    uploadError.value = 'Solo se permiten archivos de imagen'
    return
  }

  // Validar tamaño (máximo 5MB)
  if (file.size > 5 * 1024 * 1024) {
    uploadError.value = 'El archivo es demasiado grande (máximo 5MB)'
    return
  }

  try {
    uploading.value = true
    uploadError.value = null

    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error('Error al subir el archivo')
    }

    const data = await response.json()
    emit('update:modelValue', data.url)
  } catch (err) {
    uploadError.value = err instanceof Error ? err.message : 'Error al subir el archivo'
  } finally {
    uploading.value = false
    // Limpiar input
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}
</script>
