<script setup lang="ts">
import { parse } from 'yaml'
import type { SiteCmsNavigation } from '#shared/types/cms'
import type { SchemaSection } from '#shared/types/schema'
import type { FormState } from '#shared/types/schema'
import { parseSections } from '#shared/utils/schema'

definePageMeta({ layout: 'site' })

const route = useRoute()
const router = useRouter()
const toast = useToast()

const slug = computed(() => route.params.slug as string)
const collectionName = computed(() => route.params.name as string)
const selectedEntrySlug = computed(() => (route.query.entry as string | undefined) ?? '')

const { data: siteCms, error: siteCmsError } = await useFetch<SiteCmsNavigation>(
  () => `/api/sites/slug/${slug.value}/cms`,
  {
    watch: [slug],
    key: `site-cms-collection-${slug.value}`,
  },
)

const siteId = computed(() => siteCms.value?.site.id ?? null)

const schemaState = useEditorState<SchemaSection[]>()
const entriesState = useEditorState<string[]>()
const entryState = useEditorState<FormState>()
const draftSlug = ref('')

function parseSchemaSections(raw: Record<string, unknown>): SchemaSection[] {
  return parseSections(raw)
}

async function loadCollectionSchema() {
  if (!siteId.value) return

  schemaState.setLoading()
  try {
    const schemaText = await $fetch<string>(
      `/api/sites/${siteId.value}/cms/schema/collection/${collectionName.value}`,
      { responseType: 'text' },
    )
    const parsed = parse(schemaText) as Record<string, unknown>
    schemaState.setSuccess(parseSchemaSections(parsed))
  } catch (err) {
    schemaState.setError(err instanceof Error ? err.message : 'Failed to load schema')
  }
}

async function loadEntries() {
  if (!siteId.value) return

  entriesState.setLoading()
  try {
    const response = await $fetch<{ data: { entries: string[] } }>(
      `/api/sites/${siteId.value}/data/collection/${collectionName.value}/entries`,
    )
    entriesState.setSuccess(response.data.entries)
  } catch (err) {
    entriesState.setError(err instanceof Error ? err.message : 'Failed to load entries')
  }
}

async function loadSelectedEntry() {
  if (!siteId.value || !selectedEntrySlug.value) {
    entryState.reset()
    return
  }

  entryState.setLoading()
  try {
    const response = await $fetch<{ data: { content: Record<string, unknown> } }>(
      `/api/sites/${siteId.value}/data/collection/${collectionName.value}/${selectedEntrySlug.value}`,
    )
    entryState.setSuccess(response.data.content as FormState)
  } catch (err) {
    entryState.setError(err instanceof Error ? err.message : 'Failed to load entry')
  }
}

async function loadCollectionEditor() {
  if (!siteId.value) return

  schemaState.setLoading()
  entriesState.setLoading()

  try {
    await Promise.all([loadCollectionSchema(), loadEntries()])
    await loadSelectedEntry()
  } catch (err) {
    schemaState.setError(err instanceof Error ? err.message : 'Failed to load collection')
  }
}

async function openEntry(nextSlug: string) {
  await router.replace({ query: { ...route.query, entry: nextSlug } })
}

async function createEntry() {
  const normalized = draftSlug.value.trim().toLowerCase().replace(/\s+/g, '-')

  if (!normalized) {
    toast.add({
      title: 'Slug requerido',
      description: 'Ingresa un slug para crear la entrada.',
      color: 'warning',
      icon: 'i-lucide-info',
    })
    return
  }

  if (entriesState.data?.includes(normalized)) {
    toast.add({
      title: 'Slug duplicado',
      description: 'Ya existe una entrada con ese slug.',
      color: 'warning',
      icon: 'i-lucide-info',
    })
    return
  }

  draftSlug.value = ''
  entryState.reset()
  await openEntry(normalized)
}

async function saveEntry(content: FormState) {
  if (!siteId.value || !selectedEntrySlug.value) return

  entryState.setSaving()

  try {
    const endpoint = [
      '/api/sites',
      siteId.value,
      'data',
      'collection',
      collectionName.value,
      selectedEntrySlug.value,
    ].join('/')

    await $fetch(endpoint, {
      method: 'PUT',
      body: { content },
    })

    await loadEntries()

    toast.add({
      title: 'Entrada guardada',
      description: 'El borrador de la entrada se guardo en /data.',
      color: 'success',
      icon: 'i-lucide-check',
    })

    entryState.setSuccess(content)
  } catch (err) {
    entryState.setError(err instanceof Error ? err.message : 'Error inesperado al guardar.')
  }
}

watch(
  [siteId, collectionName],
  () => {
    schemaState.reset()
    entriesState.reset()
    entryState.reset()
    loadCollectionEditor()
  },
  { immediate: true },
)

watch(selectedEntrySlug, () => {
  loadSelectedEntry()
})

useHead(() => ({
  title: `${collectionName.value} — Collection Editor`,
}))
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="collectionName">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="grid gap-6 p-6 lg:grid-cols-[280px,1fr]">
        <UCard>
          <template #header>
            <div class="text-sm font-semibold">Entries</div>
          </template>

          <div class="mb-4 flex gap-2">
            <UInput v-model="draftSlug" placeholder="nuevo-slug" class="flex-1" />
            <UButton icon="i-lucide-plus" color="primary" @click="createEntry" />
          </div>

          <div class="flex flex-col gap-2">
            <UButton
              v-for="entry in entriesState.data"
              :key="entry"
              :label="entry"
              :variant="selectedEntrySlug === entry ? 'solid' : 'ghost'"
              color="neutral"
              block
              @click="openEntry(entry)"
            />

            <p v-if="entriesState.data?.length === 0" class="text-sm text-muted">
              No hay entradas aun.
            </p>
          </div>
        </UCard>

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
            v-if="schemaState.error"
            icon="i-lucide-triangle-alert"
            color="error"
            variant="subtle"
            title="No se pudo cargar la coleccion"
            :description="schemaState.error"
            class="mb-4"
          />

          <template v-if="schemaState.isLoading || entriesState.isLoading">
            <div class="space-y-4">
              <USkeleton class="h-10 w-60" />
              <USkeleton class="h-52 w-full" />
              <USkeleton class="h-52 w-full" />
            </div>
          </template>

          <UAlert
            v-else-if="entryState.isError"
            icon="i-lucide-triangle-alert"
            color="error"
            variant="subtle"
            title="Error al cargar entrada"
            :description="entryState.error ?? ''"
            class="mb-4"
          />

          <UAlert
            v-else-if="!selectedEntrySlug"
            icon="i-lucide-info"
            color="info"
            variant="subtle"
            title="Selecciona una entrada"
            description="Elige una entrada del listado o crea una nueva con un slug."
          />

          <EditorDynamicForm
            v-else-if="schemaState.data && entryState.data"
            v-model="entryState.data"
            :sections="schemaState.data"
            :is-saving="entryState.isSaving"
            @submit="saveEntry($event)"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
