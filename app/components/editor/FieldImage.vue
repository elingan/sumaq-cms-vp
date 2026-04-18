<template>
  <div class="flex flex-col gap-2">
    <div class="flex gap-2">
      <UInput
        type="url"
        :model-value="String(modelValue ?? '')"
        :placeholder="field.placeholder ?? 'https://'"
        class="flex-1"
        @update:model-value="emit('update:modelValue', $event)"
      />

      <UButton
        icon="i-lucide-upload"
        variant="outline"
        :loading="isUploading"
        @click="fileInput?.click()"
      >
        Subir
      </UButton>
    </div>

    <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileUpload" />

    <img
      v-if="modelValue"
      :src="String(modelValue)"
      alt="Preview"
      class="max-h-32 rounded-md object-contain border border-default"
    />

    <p v-if="uploadError" class="text-xs text-error">
      {{ uploadError }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { SchemaField } from '#shared/types/schema'

interface Props {
  field: SchemaField
  modelValue?: unknown
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: unknown): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)
const uploadError = ref<string | null>(null)

async function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) {
    return
  }

  uploadError.value = null

  try {
    isUploading.value = true
    const formData = new FormData()
    formData.append('file', file)

    const response = await $fetch<{ url?: string }>('/api/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.url) {
      throw new Error('No se recibio URL de la imagen')
    }

    emit('update:modelValue', response.url)
  } catch (error) {
    uploadError.value = error instanceof Error ? error.message : 'No se pudo subir la imagen'
  } finally {
    isUploading.value = false
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}
</script>
