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

    <EditorDynamicForm
      v-else-if="schemaState.data.value && entryState.data.value"
      v-model="entryState.data.value"
      :sections="schemaState.data.value"
      :is-saving="entryState.isSaving.value"
      @submit="saveEntry($event)"
    />
  </div>
</template>
