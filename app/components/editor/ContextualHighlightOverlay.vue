<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="rect"
        class="pointer-events-none fixed z-70 rounded-2xl border-2 bg-primary/10 shadow-lg shadow-primary/15"
        :class="isSelected ? 'border-primary' : 'border-primary/60 border-dashed'"
        :style="overlayStyle"
      >
        <div class="absolute left-3 top-3 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-2">
          <UBadge color="primary" variant="solid" class="truncate px-2 py-1 text-xs font-medium">
            {{ target?.label ?? 'Editable' }}
          </UBadge>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { ContextualEditableTarget, ContextualTargetRect } from '#shared/types/contextual'

interface Props {
  rect?: ContextualTargetRect | null
  target?: ContextualEditableTarget | null
  isSelected?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  rect: null,
  target: null,
  isSelected: false,
})

const overlayStyle = computed(() => {
  if (!props.rect) {
    return {}
  }

  return {
    top: `${props.rect.top}px`,
    left: `${props.rect.left}px`,
    width: `${props.rect.width}px`,
    height: `${props.rect.height}px`,
  }
})
</script>
