<template>
  <div class="space-y-2">
    <USelectMenu
      v-if="isMultiple"
      v-model="selectedValue"
      :items="selectOptions"
      multiple
      :placeholder="`Selecciona ${field.label.toLowerCase()}`"
    />
    <USelect
      v-else
      v-model="selectedValue"
      :items="selectOptions"
      :placeholder="`Selecciona ${field.label.toLowerCase()}`"
    />
    <p v-if="error" class="text-red-500 text-sm">
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { SchemaField, SelectOption } from '~/composables/useSchemaValidator'

const props = defineProps<{
  field: SchemaField
  modelValue: any
  error?: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

// Support multiple selection
const isMultiple = computed(() => {
  const opts = props.field.options
  return !Array.isArray(opts) && opts && typeof opts === 'object' && opts.multiple === true
})

// Two-way binding with parent
const selectedValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

// Process options to support different formats
const selectOptions = computed(() => {
  const fieldOptions = props.field.options

  // Legacy format: direct array of strings
  if (Array.isArray(fieldOptions)) {
    return fieldOptions
  }

  // New format: options object with values
  if (fieldOptions && typeof fieldOptions === 'object' && !Array.isArray(fieldOptions)) {
    const values = fieldOptions.values

    if (!values || !Array.isArray(values)) {
      return []
    }

    // Array of strings: ["Tech", "News", "Sports"]
    if (values.length > 0 && typeof values[0] === 'string') {
      return values as string[]
    }

    // Array of objects: [{ value: "bob", label: "Bob Smith" }]
    if (values.length > 0 && typeof values[0] === 'object') {
      return (values as SelectOption[]).map((opt) => ({
        label: opt.label,
        value: opt.value,
      }))
    }
  }

  return []
})
</script>
