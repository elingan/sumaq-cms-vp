<template>
  <div class="flex flex-col gap-3">
    <div
      v-for="(item, index) in items"
      :key="index"
      class="flex flex-col gap-3 p-3 rounded-lg border border-default"
    >
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-muted">
          {{ t('editor.item', { n: index + 1 }) }}
        </span>
        <UButton
          icon="i-lucide-trash-2"
          size="xs"
          color="error"
          variant="ghost"
          @click="removeItem(index)"
        />
      </div>

      <template v-if="field.fields?.length">
        <DynamicField
          v-for="subField in field.fields"
          :key="subField.key"
          :field="subField"
          :model-value="(item as Record<string, unknown>)[subField.key]"
          @update:model-value="updateItemField(index, subField.key, $event)"
        />
      </template>
      <template v-else>
        <DynamicField
          :field="{ ...field, type: 'string', key: 'value' }"
          :model-value="item"
          @update:model-value="updateItem(index, $event)"
        />
      </template>
    </div>

    <UButton
      icon="i-lucide-plus"
      :label="t('editor.addItem')"
      variant="outline"
      size="sm"
      class="self-start"
      @click="addItem"
    />
  </div>
</template>

<script setup lang="ts">
import type { SchemaField } from '#shared/types/schema'

const { t } = useI18n()

interface Props {
  field: SchemaField
  modelValue?: unknown
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: unknown): void
}>()

const items = computed<unknown[]>(() => {
  return Array.isArray(props.modelValue) ? props.modelValue : []
})

function addItem() {
  const newItem = props.field.fields?.length
    ? Object.fromEntries((props.field.fields ?? []).map((f) => [f.key, '']))
    : ''
  emit('update:modelValue', [...items.value, newItem])
}

function removeItem(index: number) {
  const updated = items.value.filter((_, i) => i !== index)
  emit('update:modelValue', updated)
}

function updateItem(index: number, value: unknown) {
  const updated = items.value.map((item, i) => (i === index ? value : item))
  emit('update:modelValue', updated)
}

function updateItemField(index: number, key: string, value: unknown) {
  const updated = items.value.map((item, i) =>
    i === index ? { ...(item as Record<string, unknown>), [key]: value } : item,
  )
  emit('update:modelValue', updated)
}
</script>
