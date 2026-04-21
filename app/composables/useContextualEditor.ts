import type {
  ContextualEditableTarget,
  ContextualEditorOptions,
  ContextualTargetRect,
} from '#shared/types/contextual'
import type { FormState, SchemaField, SchemaSection } from '#shared/types/schema'
import {
  buildContextualPath,
  getValueAtContextualPath,
  type ContextualPathSegment,
  setValueAtContextualPath,
} from '#shared/utils/contextualPath'

function canEditContextually(field: SchemaField, sectionInlineEnabled: boolean) {
  if (!sectionInlineEnabled) {
    return false
  }

  return field.editableIn !== 'form'
}

function createTarget(
  section: SchemaSection,
  field: SchemaField,
  valuePath: ContextualPathSegment[],
  schemaPath: string[],
  label: string,
): ContextualEditableTarget {
  const path = buildContextualPath(valuePath)

  return {
    id: path,
    sectionId: section.id,
    fieldId: field.id,
    path,
    valuePath,
    schemaPath,
    label,
    type: field.type,
    description: field.description,
    helpText: field.helpText,
  }
}

function collectFieldTargets(
  section: SchemaSection,
  field: SchemaField,
  currentValue: unknown,
  valuePath: ContextualPathSegment[],
  schemaPath: string[],
  label: string,
  sectionInlineEnabled: boolean,
): ContextualEditableTarget[] {
  if (!canEditContextually(field, sectionInlineEnabled)) {
    return []
  }

  const collected: ContextualEditableTarget[] = [
    createTarget(section, field, valuePath, schemaPath, label),
  ]

  if (!field.fields?.length) {
    return collected
  }

  if (field.type === 'list' && Array.isArray(currentValue)) {
    currentValue.forEach((item, index) => {
      for (const nestedField of field.fields ?? []) {
        const nestedValue =
          item && typeof item === 'object'
            ? (item as Record<string, unknown>)[nestedField.id]
            : undefined

        collected.push(
          ...collectFieldTargets(
            section,
            nestedField,
            nestedValue,
            [...valuePath, index, nestedField.id],
            [...schemaPath, nestedField.id],
            `${label} #${index + 1} · ${nestedField.label}`,
            sectionInlineEnabled,
          ),
        )
      }
    })

    return collected
  }

  const nestedContainer =
    currentValue && typeof currentValue === 'object'
      ? (currentValue as Record<string, unknown>)
      : {}

  for (const nestedField of field.fields ?? []) {
    collected.push(
      ...collectFieldTargets(
        section,
        nestedField,
        nestedContainer[nestedField.id],
        [...valuePath, nestedField.id],
        [...schemaPath, nestedField.id],
        `${label} · ${nestedField.label}`,
        sectionInlineEnabled,
      ),
    )
  }

  return collected
}

function getValueByTarget(formState: FormState, target: ContextualEditableTarget | null) {
  if (!target) {
    return undefined
  }

  return getValueAtContextualPath(formState, target.valuePath)
}

function resolveFieldFromSchemaPath(section: SchemaSection, schemaPath: string[]) {
  if (!schemaPath.length) {
    return null
  }

  let fields: SchemaField[] | undefined = section.fields
  let resolvedField: SchemaField | null = null

  for (const segment of schemaPath) {
    resolvedField = fields?.find((field) => field.id === segment) ?? null

    if (!resolvedField) {
      return null
    }

    fields = resolvedField.fields
  }

  return resolvedField
}

function findFieldByTarget(
  sections: SchemaSection[],
  target: ContextualEditableTarget | null,
): SchemaField | null {
  if (!target) {
    return null
  }

  const section = sections.find((item) => item.id === target.sectionId)
  if (!section) {
    return null
  }

  return resolveFieldFromSchemaPath(section, target.schemaPath)
}

export function useContextualEditor(options: ContextualEditorOptions) {
  const isContextualMode = ref(options.initialMode ?? false)
  const hoveredTargetId = ref<string | null>(null)
  const selectedTargetId = ref<string | null>(null)
  const overlayRect = ref<ContextualTargetRect | null>(null)
  const drawerOpen = ref(false)
  const lastCommittedValue = ref<unknown>(undefined)

  const targets = computed<ContextualEditableTarget[]>(() => {
    return options.sections.value.flatMap((section) => {
      const sectionInlineEnabled = section.editInline !== false

      return section.fields.flatMap((field) => {
        const initialValue = options.formState.value[section.id]?.[field.id]

        return collectFieldTargets(
          section,
          field,
          initialValue,
          [section.id, field.id],
          [field.id],
          field.label,
          sectionInlineEnabled,
        )
      })
    })
  })

  const targetsById = computed<Record<string, ContextualEditableTarget>>(() => {
    return Object.fromEntries(targets.value.map((target) => [target.id, target]))
  })

  const selectedTarget = computed(() => {
    return selectedTargetId.value ? (targetsById.value[selectedTargetId.value] ?? null) : null
  })

  const hoveredTarget = computed(() => {
    return hoveredTargetId.value ? (targetsById.value[hoveredTargetId.value] ?? null) : null
  })

  const selectedValue = computed(() =>
    getValueByTarget(options.formState.value, selectedTarget.value),
  )

  const selectedField = computed(() => {
    return findFieldByTarget(options.sections.value, selectedTarget.value)
  })

  const isDirty = computed(() => {
    return (
      drawerOpen.value &&
      selectedTarget.value !== null &&
      selectedValue.value !== lastCommittedValue.value
    )
  })

  function setContextualMode(value: boolean) {
    isContextualMode.value = value

    if (!value) {
      clearSelection()
      clearHover()
    }
  }

  function setHoveredTarget(targetId: string | null, rect?: ContextualTargetRect | null) {
    hoveredTargetId.value = targetId

    if (!selectedTargetId.value) {
      overlayRect.value = targetId ? (rect ?? overlayRect.value) : null
    }
  }

  function setSelectedTarget(targetId: string | null, rect?: ContextualTargetRect | null) {
    selectedTargetId.value = targetId
    drawerOpen.value = !!targetId
    overlayRect.value = targetId ? (rect ?? overlayRect.value) : null
    lastCommittedValue.value = targetId
      ? getValueByTarget(options.formState.value, targetsById.value[targetId] ?? null)
      : undefined
  }

  function setOverlayRect(rect: ContextualTargetRect | null) {
    overlayRect.value = rect
  }

  function updateSelectedValue(value: unknown) {
    const target = selectedTarget.value

    if (!target) {
      return
    }

    options.formState.value = setValueAtContextualPath(
      options.formState.value,
      target.valuePath,
      value,
    ) as FormState
  }

  function commitSelectedValue() {
    lastCommittedValue.value = selectedValue.value
  }

  function clearHover() {
    hoveredTargetId.value = null

    if (!selectedTargetId.value) {
      overlayRect.value = null
    }
  }

  function clearSelection() {
    selectedTargetId.value = null
    drawerOpen.value = false
    lastCommittedValue.value = undefined

    if (!hoveredTargetId.value) {
      overlayRect.value = null
    }
  }

  function closeDrawer() {
    drawerOpen.value = false
  }

  watch(
    () => options.sections.value,
    () => {
      if (selectedTargetId.value && !targetsById.value[selectedTargetId.value]) {
        clearSelection()
      }

      if (hoveredTargetId.value && !targetsById.value[hoveredTargetId.value]) {
        clearHover()
      }
    },
    { deep: true },
  )

  return {
    isContextualMode,
    hoveredTargetId,
    selectedTargetId,
    overlayRect,
    drawerOpen,
    targets,
    targetsById,
    hoveredTarget,
    selectedTarget,
    selectedField,
    selectedValue,
    isDirty,
    setContextualMode,
    setHoveredTarget,
    setSelectedTarget,
    setOverlayRect,
    updateSelectedValue,
    commitSelectedValue,
    closeDrawer,
    clearHover,
    clearSelection,
  }
}
