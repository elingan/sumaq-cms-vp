<script setup lang="ts">
import { parse } from 'yaml'
import type { SiteCmsNavigation } from '#shared/types/cms'
import type { FormState, SchemaSection } from '#shared/types/schema'
import { parseSections } from '#shared/utils/schema'

const route = useRoute()
const toast = useToast()

const slug = computed(() => route.params.slug as string)
const collectionName = computed(() => route.params.name as string)
const entrySlug = computed(() => route.params.entry as string)

const { data: siteCms, error: siteCmsError } = await useFetch<SiteCmsNavigation>(
  () => `/api/sites/slug/${slug.value}/cms`,
  {
    watch: [slug],
    key: `site-cms-collection-${slug.value}`,
  },
)

const siteId = computed(() => siteCms.value?.site.id ?? null)
const collectionExists = computed(() => {
  return (siteCms.value?.collections ?? []).some((entry) => entry.name === collectionName.value)
})

const schemaState = useEditorState<SchemaSection[]>()
const entryState = useEditorState<FormState>()
const entryFormState = computed<FormState>({
  get: () => entryState.data.value ?? {},
  set: (value) => {
    entryState.data.value = value
  },
})

function isErrorWithStatus(error: unknown, statusCode: number) {
  return typeof error === 'object' && error !== null && 'statusCode' in error
    ? Number((error as { statusCode?: number }).statusCode) === statusCode
    : false
}

async function loadCollectionSchema() {
  if (!siteId.value || !collectionExists.value) {
    schemaState.reset()
    return false
  }

  schemaState.setLoading()

  try {
    const schemaText = await $fetch<string>(
      `/api/sites/${siteId.value}/cms/schema/collection/${collectionName.value}`,
      { responseType: 'text' },
    )

    schemaState.setSuccess(parseSections(parse(schemaText) as Record<string, unknown>))
    return true
  } catch (error) {
    if (isErrorWithStatus(error, 404)) {
      schemaState.setError(`La colección "${collectionName.value}" no existe.`)
      return false
    }

    schemaState.setError(
      error instanceof Error ? error.message : 'No se pudo cargar el esquema de la colección.',
    )
    return false
  }
}

async function loadEntry() {
  if (!siteId.value || !entrySlug.value || !collectionExists.value) {
    entryState.reset()
    return
  }

  entryState.setLoading()

  try {
    const response = await $fetch<{ data: { exists: boolean; content: Record<string, unknown> } }>(
      `/api/sites/${siteId.value}/data/collection/${collectionName.value}/${entrySlug.value}`,
    )

    if (!response.data.exists) {
      entryState.setError(`La entrada "${entrySlug.value}" no existe en esta colección.`)
      return
    }

    entryState.setSuccess(response.data.content as FormState)
  } catch (error) {
    entryState.setError(
      error instanceof Error ? error.message : 'No se pudo cargar la entrada seleccionada.',
    )
  }
}

async function loadCollectionEntry() {
  const schemaLoaded = await loadCollectionSchema()

  if (!schemaLoaded) {
    entryState.reset()
    return
  }

  await loadEntry()
}

async function saveEntry(content: FormState) {
  if (!siteId.value || !entrySlug.value || !collectionExists.value) {
    return
  }

  entryState.setSaving()

  try {
    const endpoint = [
      '/api/sites',
      siteId.value,
      'data',
      'collection',
      collectionName.value,
      entrySlug.value,
    ].join('/')

    await $fetch(endpoint, {
      method: 'PUT',
      body: { content },
    })

    toast.add({
      title: 'Entrada guardada',
      description: 'El borrador de la entrada se guardó en /data.',
      color: 'success',
      icon: 'i-lucide-check',
    })

    entryState.setSuccess(content)
  } catch (error) {
    entryState.setError(error instanceof Error ? error.message : 'Error inesperado al guardar.')
  }
}

const contextualSurface = useContextualSurface({
  sections: computed(() => schemaState.data.value ?? []),
  formState: entryFormState,
  save: saveEntry,
})

watch(
  [siteId, collectionName, entrySlug],
  () => {
    schemaState.reset()
    entryState.reset()
    loadCollectionEntry()
  },
  { immediate: true },
)

useHead(() => ({
  title: `${collectionName.value}/${entrySlug.value} — Collection Item`,
}))
</script>

<template>
  <div>
    <UAlert
      v-if="siteCmsError"
      icon="i-lucide-triangle-alert"
      color="error"
      variant="subtle"
      title="No se pudo cargar el sitio"
      :description="siteCmsError.message"
      class="mb-4"
    />

    <UAlert
      v-else-if="schemaState.error.value"
      icon="i-lucide-triangle-alert"
      color="error"
      variant="subtle"
      title="Colección no disponible"
      :description="schemaState.error.value"
      class="mb-4"
    />

    <template v-else-if="schemaState.isLoading.value || entryState.isLoading.value">
      <div class="space-y-4">
        <USkeleton class="h-10 w-60" />
        <USkeleton class="h-52 w-full" />
        <USkeleton class="h-52 w-full" />
      </div>
    </template>

    <UAlert
      v-else-if="entryState.error.value"
      icon="i-lucide-triangle-alert"
      color="error"
      variant="subtle"
      title="Entrada no disponible"
      :description="entryState.error.value"
      class="mb-4"
    />

    <div v-else-if="schemaState.data.value && entryState.data.value" class="space-y-4">
      <div class="flex flex-wrap items-center gap-2">
        <UBadge
          v-if="contextualSurface.hasContextualTargets.value"
          color="primary"
          variant="subtle"
        >
          {{ contextualSurface.contextualEditor.targets.value.length }} bloques editables
        </UBadge>

        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-panel-bottom-open"
          :disabled="!contextualSurface.hasContextualTargets.value"
          @click="contextualSurface.contextualEditor.setContextualMode(true)"
        >
          Vista previa editable
        </UButton>

        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-table-properties"
          @click="contextualSurface.contextualEditor.setContextualMode(false)"
        >
          Formulario completo
        </UButton>
      </div>

      <UAlert
        v-if="
          contextualSurface.contextualEditor.isContextualMode.value &&
          !contextualSurface.hasContextualTargets.value
        "
        icon="i-lucide-info"
        color="info"
        variant="subtle"
        title="Sin bloques editables contextuales"
        description="Esta entrada solo expone edición contextual para campos hoja. Usa el formulario completo para estructuras complejas."
      />

      <div
        v-else-if="contextualSurface.contextualEditor.isContextualMode.value"
        class="relative space-y-4 pb-40"
      >
        <UAlert
          icon="i-lucide-sparkles"
          color="primary"
          variant="subtle"
          title="Modo contextual activo"
          description="Pasa el cursor por un bloque editable y haz click para abrir el panel inferior."
        />

        <EditorContextualPreview
          ref="contextualSurface.previewRef"
          :sections="schemaState.data.value"
          :model-value="entryFormState"
          :targets="contextualSurface.contextualEditor.targets.value"
          :hovered-target-id="contextualSurface.contextualEditor.hoveredTargetId.value"
          :selected-target-id="contextualSurface.contextualEditor.selectedTargetId.value"
          @hover-target="contextualSurface.handleHoverTarget"
          @leave-target="contextualSurface.handleLeaveTarget"
          @select-target="contextualSurface.handleSelectTarget"
        />

        <EditorContextualHighlightOverlay
          :rect="contextualSurface.contextualEditor.overlayRect.value"
          :target="
            contextualSurface.contextualEditor.selectedTarget.value ??
            contextualSurface.contextualEditor.hoveredTarget.value
          "
          :is-selected="!!contextualSurface.contextualEditor.selectedTargetId.value"
        />

        <EditorContextualDrawer
          :open="contextualSurface.contextualEditor.drawerOpen.value"
          :target="contextualSurface.contextualEditor.selectedTarget.value"
          :field="contextualSurface.contextualEditor.selectedField.value"
          :model-value="contextualSurface.contextualEditor.selectedValue.value"
          :is-saving="entryState.isSaving.value"
          :is-dirty="contextualSurface.contextualEditor.isDirty.value"
          @update:model-value="contextualSurface.contextualEditor.updateSelectedValue($event)"
          @save="contextualSurface.saveContextualField"
          @close="contextualSurface.closeContextualDrawer"
          @open-form="contextualSurface.openFullForm"
        />
      </div>

      <EditorDynamicForm
        v-else
        v-model="entryState.data.value"
        :sections="schemaState.data.value"
        :is-saving="entryState.isSaving.value"
        @submit="saveEntry($event)"
      />
    </div>
  </div>
</template>
