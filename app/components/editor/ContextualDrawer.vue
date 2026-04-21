<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-full opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-full opacity-0"
    >
      <div v-if="open && field && target" class="fixed inset-x-0 bottom-0 z-80 px-4 pb-4 lg:px-6">
        <div
          class="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-default bg-default shadow-2xl"
        >
          <div
            class="flex flex-col gap-4 border-b border-default px-4 py-4 lg:flex-row lg:items-start lg:justify-between lg:px-6"
          >
            <div class="min-w-0 space-y-2">
              <div class="inline-flex items-center gap-2">
                <UBadge color="primary" variant="subtle">
                  {{ target.sectionId }}
                </UBadge>
                <UBadge color="neutral" variant="soft">
                  {{ field.type }}
                </UBadge>
              </div>

              <div>
                <h3 class="truncate text-lg font-semibold text-highlighted">
                  {{ target.label }}
                </h3>
                <p v-if="target.description || target.helpText" class="text-sm text-muted">
                  {{ target.helpText ?? target.description }}
                </p>
                <p v-else class="text-sm text-muted">
                  Edita este bloque desde el panel inferior. Los cambios tambien disparan autosave.
                </p>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <UBadge v-if="isDirty" color="warning" variant="subtle">
                Cambios sin confirmar
              </UBadge>

              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-panel-bottom-open"
                @click="emit('openForm')"
              >
                Ver formulario completo
              </UButton>
              <UButton color="neutral" variant="ghost" icon="i-lucide-x" @click="emit('close')">
                Cerrar
              </UButton>
              <UButton
                color="primary"
                icon="i-lucide-save"
                :loading="isSaving"
                @click="emit('save')"
              >
                Guardar ahora
              </UButton>
            </div>
          </div>

          <div class="max-h-[min(55vh,36rem)] overflow-y-auto px-4 py-5 lg:px-6">
            <UCard :ui="{ body: 'space-y-4 p-4 lg:p-5' }">
              <EditorDynamicField
                :field="field"
                :model-value="modelValue"
                @update:model-value="emit('update:modelValue', $event)"
              />
            </UCard>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { ContextualEditableTarget } from '#shared/types/contextual'
import type { SchemaField } from '#shared/types/schema'

interface Props {
  open: boolean
  target?: ContextualEditableTarget | null
  field?: SchemaField | null
  modelValue?: unknown
  isSaving?: boolean
  isDirty?: boolean
}

withDefaults(defineProps<Props>(), {
  target: null,
  field: null,
  modelValue: undefined,
  isSaving: false,
  isDirty: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: unknown]
  close: []
  save: []
  openForm: []
}>()
</script>
