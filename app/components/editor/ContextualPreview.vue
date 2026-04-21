<template>
  <div ref="root" class="space-y-6">
    <UCard
      v-for="section in sections"
      :key="section.id"
      :ui="{ body: 'space-y-4 p-4 lg:p-5', header: 'px-4 py-4 lg:px-5' }"
    >
      <template #header>
        <div class="flex items-start gap-3">
          <div v-if="section.icon" class="rounded-xl bg-primary/10 p-2 text-primary">
            <UIcon :name="section.icon" class="size-5" />
          </div>

          <div class="min-w-0">
            <h3 class="text-base font-semibold text-highlighted">
              {{ section.label }}
            </h3>
            <p v-if="section.description" class="text-sm text-muted">
              {{ section.description }}
            </p>
          </div>
        </div>
      </template>

      <div class="grid gap-4 lg:grid-cols-2">
        <article
          v-for="field in section.fields"
          :key="field.id"
          :data-contextual-target="targetId(section.id, field.id)"
          class="rounded-2xl border border-default bg-muted/30 p-4 transition-colors"
          :class="cardClass(section, field)"
          @mouseenter="handleHover(section, field)"
          @mousemove="handleHover(section, field)"
          @mouseleave="emit('leaveTarget')"
          @click="handleSelect(section, field)"
        >
          <div class="mb-3 flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm font-medium text-highlighted">
                {{ field.label }}
              </p>
              <p v-if="field.description" class="mt-1 text-xs text-muted">
                {{ field.description }}
              </p>
            </div>

            <UBadge :color="isEditable(section, field) ? 'primary' : 'neutral'" variant="subtle">
              {{ isEditable(section, field) ? 'Editable' : field.type }}
            </UBadge>
          </div>

          <div class="space-y-3">
            <template v-if="field.type === 'image' && isMediaUrl(valueFor(section.id, field.id))">
              <img
                :src="String(valueFor(section.id, field.id))"
                :alt="field.label"
                class="h-44 w-full rounded-xl object-cover"
              />
            </template>

            <template
              v-else-if="field.type === 'video' && isMediaUrl(valueFor(section.id, field.id))"
            >
              <video
                :src="String(valueFor(section.id, field.id))"
                controls
                class="h-44 w-full rounded-xl bg-black/90"
              />
            </template>

            <template
              v-else-if="
                field.type === 'richtext' &&
                typeof valueFor(section.id, field.id) === 'string' &&
                valueFor(section.id, field.id)
              "
            >
              <p class="whitespace-pre-wrap text-sm leading-6 text-default">
                {{ richTextValue(valueFor(section.id, field.id)) }}
              </p>
            </template>

            <template v-else-if="Array.isArray(valueFor(section.id, field.id))">
              <div class="space-y-2">
                <div
                  v-for="(item, index) in previewItems(valueFor(section.id, field.id))"
                  :key="`${targetId(section.id, field.id)}-${index}`"
                  class="rounded-xl border border-default bg-default/70 px-3 py-2"
                >
                  <p class="text-xs font-medium text-muted">Item {{ index + 1 }}</p>
                  <p class="mt-1 text-sm text-default">
                    {{ summarizeValue(item) }}
                  </p>
                </div>

                <p
                  v-if="arrayOverflow(valueFor(section.id, field.id)) > 0"
                  class="text-xs text-muted"
                >
                  +{{ arrayOverflow(valueFor(section.id, field.id)) }} item(s) mas
                </p>
              </div>
            </template>

            <template v-else-if="isPlainObject(valueFor(section.id, field.id))">
              <dl class="grid gap-2 sm:grid-cols-2">
                <div
                  v-for="entry in previewObjectEntries(valueFor(section.id, field.id))"
                  :key="entry.key"
                  class="rounded-xl border border-default bg-default/70 px-3 py-2"
                >
                  <dt class="text-xs font-medium uppercase tracking-wide text-muted">
                    {{ entry.key }}
                  </dt>
                  <dd class="mt-1 text-sm text-default">
                    {{ summarizeValue(entry.value) }}
                  </dd>
                </div>
              </dl>
            </template>

            <template v-else>
              <p class="whitespace-pre-wrap text-sm leading-6 text-default">
                {{ displayValue(field, valueFor(section.id, field.id)) }}
              </p>
            </template>

            <div
              v-if="nestedTargets(section.id, field.id).length"
              class="border-t border-default/80 pt-3"
            >
              <p class="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                Campos anidados
              </p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="target in nestedTargets(section.id, field.id)"
                  :key="target.id"
                  type="button"
                  :data-contextual-target="target.id"
                  class="max-w-full rounded-lg border px-2 py-1 text-left text-xs transition-colors"
                  :class="[
                    selectedTargetId === target.id
                      ? 'border-primary bg-primary/15 text-primary'
                      : hoveredTargetId === target.id
                        ? 'border-primary/70 bg-primary/10 text-primary'
                        : 'border-default bg-default/70 text-default hover:border-primary/50 hover:text-primary',
                  ]"
                  @mouseenter.stop="handleHoverNested(target.id)"
                  @mousemove.stop="handleHoverNested(target.id)"
                  @mouseleave.stop="emit('leaveTarget')"
                  @click.stop="handleSelectNested(target.id)"
                >
                  <p class="truncate font-medium">
                    {{ target.label }}
                  </p>
                  <p class="truncate text-muted">
                    {{ summarizeValue(valueForTarget(target)) }}
                  </p>
                </button>
              </div>
            </div>
          </div>
        </article>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ContextualEditableTarget, ContextualTargetRect } from '#shared/types/contextual'
import type { FormState, SchemaField, SchemaSection } from '#shared/types/schema'
import { getValueAtContextualPath } from '#shared/utils/contextualPath'

interface HoverPayload {
  targetId: string
  rect: ContextualTargetRect | null
}

interface Props {
  sections: SchemaSection[]
  modelValue?: FormState
  targets?: ContextualEditableTarget[]
  hoveredTargetId?: string | null
  selectedTargetId?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ({}),
  targets: () => [],
  hoveredTargetId: null,
  selectedTargetId: null,
})

const emit = defineEmits<{
  hoverTarget: [payload: HoverPayload]
  leaveTarget: []
  selectTarget: [payload: HoverPayload]
}>()

const root = ref<HTMLElement | null>(null)

const targetsById = computed<Record<string, ContextualEditableTarget>>(() => {
  return Object.fromEntries(props.targets.map((target) => [target.id, target]))
})

function targetId(sectionId: string, fieldId: string) {
  return `${sectionId}.${fieldId}`
}

function hasTarget(targetPath: string) {
  return !!targetsById.value[targetPath]
}

function isEditable(section: SchemaSection, field: SchemaField) {
  return hasTarget(targetId(section.id, field.id))
}

function selectorForTarget(id: string) {
  return `[data-contextual-target="${id.replace(/(["\\])/g, '\\$1')}"]`
}

function normalizeRect(rect: DOMRect): ContextualTargetRect {
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    right: rect.right,
    bottom: rect.bottom,
  }
}

function measureTarget(id: string): ContextualTargetRect | null {
  const target = root.value?.querySelector(selectorForTarget(id))

  if (!(target instanceof HTMLElement)) {
    return null
  }

  return normalizeRect(target.getBoundingClientRect())
}

function valueFor(sectionId: string, fieldId: string) {
  return props.modelValue?.[sectionId]?.[fieldId]
}

function valueForTarget(target: ContextualEditableTarget) {
  return getValueAtContextualPath(props.modelValue, target.valuePath)
}

function nestedTargets(sectionId: string, fieldId: string) {
  const prefix = `${sectionId}.${fieldId}.`

  return props.targets.filter((target) => {
    if (!target.id.startsWith(prefix)) {
      return false
    }

    const suffix = target.id.slice(prefix.length)
    return suffix.length > 0
  })
}

function isMediaUrl(value: unknown) {
  return typeof value === 'string' && value.length > 0
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function previewItems(value: unknown) {
  return Array.isArray(value) ? value.slice(0, 3) : []
}

function arrayOverflow(value: unknown) {
  return Array.isArray(value) && value.length > 3 ? value.length - 3 : 0
}

function previewObjectEntries(value: unknown) {
  if (!isPlainObject(value)) {
    return []
  }

  return Object.entries(value)
    .slice(0, 4)
    .map(([key, entryValue]) => ({ key, value: entryValue }))
}

function summarizeValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return 'Sin contenido'
  }

  if (typeof value === 'boolean') {
    return value ? 'Si' : 'No'
  }

  if (typeof value === 'string') {
    return value.length > 96 ? `${value.slice(0, 93)}...` : value
  }

  if (Array.isArray(value)) {
    return value.length ? `${value.length} item(s)` : 'Sin items'
  }

  if (isPlainObject(value)) {
    return `${Object.keys(value).length} propiedad(es)`
  }

  return String(value)
}

function displayValue(field: SchemaField, value: unknown) {
  if (value === null || value === undefined || value === '') {
    return 'Sin contenido todavia.'
  }

  if (field.type === 'boolean') {
    return value ? 'Si' : 'No'
  }

  if (Array.isArray(value)) {
    return value.length ? `${value.length} item(s)` : 'Sin items todavia.'
  }

  if (field.type === 'object' || field.type === 'media') {
    return isPlainObject(value)
      ? `${Object.keys(value).length} propiedad(es)`
      : 'Sin contenido todavia.'
  }

  if (field.type === 'url') {
    return String(value)
  }

  return String(value)
}

function richTextValue(value: unknown) {
  if (typeof value !== 'string' || !value.length) {
    return 'Sin contenido todavia.'
  }

  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function cardClass(section: SchemaSection, field: SchemaField) {
  const id = targetId(section.id, field.id)

  return {
    'cursor-pointer hover:border-primary/60 hover:bg-primary/5': isEditable(section, field),
    'ring-2 ring-primary/40 border-primary/60 bg-primary/5': props.selectedTargetId === id,
    'border-primary/50 bg-primary/5': !props.selectedTargetId && props.hoveredTargetId === id,
    'cursor-default opacity-80': !isEditable(section, field),
  }
}

function emitHoverForTarget(targetPath: string) {
  if (!hasTarget(targetPath)) {
    return
  }

  emit('hoverTarget', { targetId: targetPath, rect: measureTarget(targetPath) })
}

function emitSelectForTarget(targetPath: string) {
  if (!hasTarget(targetPath)) {
    return
  }

  emit('selectTarget', { targetId: targetPath, rect: measureTarget(targetPath) })
}

function handleHover(section: SchemaSection, field: SchemaField) {
  emitHoverForTarget(targetId(section.id, field.id))
}

function handleSelect(section: SchemaSection, field: SchemaField) {
  emitSelectForTarget(targetId(section.id, field.id))
}

function handleHoverNested(targetPath: string) {
  emitHoverForTarget(targetPath)
}

function handleSelectNested(targetPath: string) {
  emitSelectForTarget(targetPath)
}

defineExpose({
  measureTarget,
})
</script>
