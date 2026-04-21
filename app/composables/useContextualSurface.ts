import type { Ref } from 'vue'

import type { ContextualTargetRect } from '#shared/types/contextual'
import type { FormState, SchemaSection } from '#shared/types/schema'

interface HoverPayload {
  targetId: string
  rect: ContextualTargetRect | null
}

interface ContextualPreviewHandle {
  measureTarget: (id: string) => ContextualTargetRect | null
}

interface ContextualSurfaceOptions {
  sections: Ref<SchemaSection[]>
  formState: Ref<FormState>
  save: (content: FormState) => Promise<void>
  initialMode?: boolean
}

export function useContextualSurface(options: ContextualSurfaceOptions) {
  const previewRef = ref<ContextualPreviewHandle | null>(null)

  const contextualEditor = useContextualEditor({
    sections: options.sections,
    formState: options.formState,
    initialMode: options.initialMode ?? true,
  })

  const hasContextualTargets = computed(() => contextualEditor.targets.value.length > 0)

  function syncOverlayRect() {
    const activeTargetId =
      contextualEditor.selectedTargetId.value ?? contextualEditor.hoveredTargetId.value

    if (!activeTargetId) {
      contextualEditor.setOverlayRect(null)
      return
    }

    const rect = previewRef.value?.measureTarget(activeTargetId) ?? null
    contextualEditor.setOverlayRect(rect)
  }

  function handleHoverTarget(payload: HoverPayload) {
    contextualEditor.setHoveredTarget(payload.targetId, payload.rect)
  }

  function handleLeaveTarget() {
    contextualEditor.clearHover()
  }

  function handleSelectTarget(payload: HoverPayload) {
    contextualEditor.setSelectedTarget(payload.targetId, payload.rect)
  }

  async function saveContextualField() {
    await options.save(options.formState.value)
    contextualEditor.commitSelectedValue()
  }

  function openFullForm() {
    contextualEditor.setContextualMode(false)
    contextualEditor.closeDrawer()
  }

  function closeContextualDrawer() {
    contextualEditor.closeDrawer()
    contextualEditor.clearSelection()
  }

  watch(
    [() => contextualEditor.selectedTargetId.value, () => contextualEditor.hoveredTargetId.value],
    () => {
      void nextTick(syncOverlayRect)
    },
  )

  watch(
    () => contextualEditor.drawerOpen.value,
    (isOpen) => {
      if (!isOpen) {
        contextualEditor.clearSelection()
      }
    },
  )

  if (import.meta.client) {
    onMounted(() => {
      window.addEventListener('resize', syncOverlayRect)
      window.addEventListener('scroll', syncOverlayRect, true)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('resize', syncOverlayRect)
      window.removeEventListener('scroll', syncOverlayRect, true)
    })
  }

  return {
    previewRef,
    contextualEditor,
    hasContextualTargets,
    handleHoverTarget,
    handleLeaveTarget,
    handleSelectTarget,
    saveContextualField,
    openFullForm,
    closeContextualDrawer,
    syncOverlayRect,
  }
}
