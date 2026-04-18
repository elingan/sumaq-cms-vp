<template>
  <div class="flex flex-col gap-3">
    <div ref="listContainer" class="flex flex-col gap-3">
      <div
        v-for="(item, index) in items"
        :key="getItemKey(item, index)"
        class="flex flex-col gap-3 rounded-lg border border-default p-3"
      >
        <div class="flex items-center justify-between">
          <div class="inline-flex items-center gap-2">
            <div
              class="drag-handle inline-flex cursor-grab items-center rounded p-1 hover:bg-muted"
            >
              <UIcon name="i-lucide-grip-vertical" class="size-4 text-muted" />
            </div>

            <span class="text-sm font-medium text-muted">
              {{ t('editor.item', { n: index + 1 }) }}
            </span>
          </div>

          <UButton
            icon="i-lucide-trash-2"
            size="xs"
            color="error"
            variant="ghost"
            @click="removeItem(index)"
          />
        </div>

        <template v-if="field.fields?.length">
          <EditorDynamicField
            v-for="subField in field.fields"
            :key="subField.key"
            :field="subField"
            :model-value="(item as Record<string, unknown>)[subField.key]"
            @update:model-value="updateItemField(index, subField.key, $event)"
          />
        </template>
        <template v-else>
          <EditorDynamicField
            :field="{ ...field, type: 'string', key: 'value' }"
            :model-value="item"
            @update:model-value="updateItem(index, $event)"
          />
        </template>
      </div>
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
import Sortable from 'sortablejs'
import type { SortableEvent } from 'sortablejs'
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

const listContainer = ref<HTMLElement | null>(null)
const itemKeys = ref<Map<unknown, string>>(new Map())
let keyCounter = 0

const items = computed<unknown[]>(() => {
  return Array.isArray(props.modelValue) ? props.modelValue : []
})

function getItemKey(item: unknown, index: number): string {
  if (typeof item !== 'object' || item === null) {
    return `primitive-${index}`
  }

  if (!itemKeys.value.has(item)) {
    itemKeys.value.set(item, `item-${keyCounter++}-${index}`)
  }

  return itemKeys.value.get(item) ?? `item-${index}`
}

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

watch(
  items,
  (newItems) => {
    const objectItems = new Set<object>(
      newItems.filter((item): item is object => typeof item === 'object' && item !== null),
    )
    const toDelete: unknown[] = []

    for (const key of itemKeys.value.keys()) {
      if (typeof key !== 'object' || key === null || !objectItems.has(key)) {
        toDelete.push(key)
      }
    }

    for (const key of toDelete) {
      itemKeys.value.delete(key)
    }
  },
  { deep: true },
)

onMounted(() => {
  if (!listContainer.value) {
    return
  }

  Sortable.create(listContainer.value, {
    animation: 150,
    handle: '.drag-handle',
    ghostClass: 'opacity-60',
    onEnd: (event: SortableEvent) => {
      const { oldIndex, newIndex } = event
      if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) {
        return
      }

      const reordered = [...items.value]
      const [moved] = reordered.splice(oldIndex, 1)
      reordered.splice(newIndex, 0, moved)
      emit('update:modelValue', reordered)
    },
  })
})
</script>
