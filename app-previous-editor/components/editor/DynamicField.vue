<template>
  <!-- Validación: Componente no existe para el type especificado -->
  <div v-if="!componentExists(field.type)" class="p-4 bg-red-50 border border-red-200 rounded-md">
    <div class="flex items-start gap-2">
      <Icon name="i-lucide-alert-circle" class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
      <div class="text-sm text-red-800">
        <p class="font-medium">
          El componente para el tipo
          <code class="bg-red-100 px-1 rounded">{{ field.type }}</code> no existe
        </p>
        <p class="text-red-700 mt-1">
          Tipos válidos: string, text, number, select, url, image, video, object, list, media
        </p>
      </div>
    </div>
  </div>

  <component
    v-else
    :is="getFieldComponent(field.type)"
    :field="field"
    :model-value="modelValue"
    :error="error"
    :errors="errors"
    :preview="preview"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import type { SchemaField } from '~/composables/useSchemaValidator'
import FieldString from '~/components/Editor/FieldString.vue'
import FieldText from '~/components/Editor/FieldText.vue'
import FieldTextRich from '~/components/Editor/FieldTextRich.vue'
import FieldNumber from '~/components/Editor/FieldNumber.vue'
import FieldSelect from '~/components/Editor/FieldSelect.vue'
import FieldUrl from '~/components/Editor/FieldUrl.vue'
import FieldImage from '~/components/Editor/FieldImage.vue'
import FieldObject from '~/components/Editor/FieldObject.vue'
import FieldList from '~/components/Editor/FieldList.vue'
import FieldMedia from '~/components/Editor/FieldMedia.vue'
import FieldDate from '~/components/Editor/FieldDate.vue'
import FieldBoolean from '~/components/Editor/FieldBoolean.vue'

const props = defineProps<{
  field: SchemaField
  modelValue: any
  error?: string | null
  errors?: Record<string, string[]> | null
  preview?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: any]
}>()

const componentExists = (type: string): boolean => {
  const validTypes = [
    'string',
    'text',
    'richtext',
    'number',
    'select',
    'url',
    'image',
    'video',
    'object',
    'list',
    'media',
    'date',
    'boolean',
  ]
  return validTypes.includes(type)
}

const getFieldComponent = (type: string) => {
  const components: Record<string, any> = {
    string: FieldString,
    text: FieldText,
    richtext: FieldTextRich,
    number: FieldNumber,
    select: FieldSelect,
    url: FieldUrl,
    image: FieldImage,
    video: FieldImage,
    object: FieldObject,
    list: FieldList,
    media: FieldMedia,
    date: FieldDate,
    boolean: FieldBoolean,
  }

  return components[type] || FieldString
}
</script>
