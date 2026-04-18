<script setup lang="ts">
import { parse } from 'yaml'
import type { SiteCmsNavigation } from '#shared/types/cms'
import type { SchemaField, SchemaSection } from '#shared/types/schema'

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
const sections = ref<SchemaSection[]>([])
const entries = ref<string[]>([])
const formState = ref<Record<string, unknown>>({})
const draftSlug = ref('')
const loadError = ref<string | null>(null)
const isLoading = ref(true)
const isSaving = ref(false)

function parseSections(raw: Record<string, unknown>): SchemaSection[] {
  return Object.entries(raw).map(([sectionKey, value]) => {
    const section = value as Record<string, unknown>
    const sectionId = (section.id as string) ?? sectionKey

    const toField = (input: Record<string, unknown>): SchemaField => {
      const fieldId = (input.id as string) ?? (input.key as string)
      return {
        id: fieldId,
        key: fieldId,
        label: (input.label as string) ?? fieldId,
        type: input.type as SchemaField['type'],
        required: input.required as boolean | undefined,
        description: input.description as string | undefined,
        placeholder: input.placeholder as string | undefined,
        options: input.options as SchemaField['options'],
        fields: Array.isArray(input.fields)
          ? (input.fields as Record<string, unknown>[]).map((nested) => toField(nested))
          : undefined,
      }
    }

    return {
      id: sectionId,
      key: sectionId,
      label: (section.label as string) ?? sectionId,
      description: section.description as string | undefined,
      icon: section.icon as string | undefined,
      fields: ((section.fields as Record<string, unknown>[]) ?? []).map((field) => toField(field)),
    }
  })
}

async function loadCollectionSchema() {
  if (!siteId.value) {
    return
  }

  const schemaText = await $fetch<string>(
    `/api/sites/${siteId.value}/cms/schema/collection/${collectionName.value}`,
    {
      responseType: 'text',
    },
  )

  sections.value = parseSections(parse(schemaText) as Record<string, unknown>)
}

async function loadEntries() {
  if (!siteId.value) {
    return
  }

  const response = await $fetch<{ data: { entries: string[] } }>(
    `/api/sites/${siteId.value}/data/collection/${collectionName.value}/entries`,
  )
  entries.value = response.data.entries
}

async function loadSelectedEntry() {
  if (!siteId.value || !selectedEntrySlug.value) {
    formState.value = {}
    return
  }

  const response = await $fetch<{ data: { content: Record<string, unknown> } }>(
    `/api/sites/${siteId.value}/data/collection/${collectionName.value}/${selectedEntrySlug.value}`,
  )
  formState.value = response.data.content ?? {}
}

async function loadCollectionEditor() {
  if (!siteId.value) {
    return
  }

  isLoading.value = true
  loadError.value = null

  try {
    await Promise.all([loadCollectionSchema(), loadEntries()])
    await loadSelectedEntry()
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'No se pudo cargar la coleccion.'
  } finally {
    isLoading.value = false
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

  if (entries.value.includes(normalized)) {
    toast.add({
      title: 'Slug duplicado',
      description: 'Ya existe una entrada con ese slug.',
      color: 'warning',
      icon: 'i-lucide-info',
    })
    return
  }

  draftSlug.value = ''
  formState.value = {}
  await openEntry(normalized)
}

async function saveEntry(content: Record<string, unknown>) {
  if (!siteId.value || !selectedEntrySlug.value) {
    return
  }

  isSaving.value = true

  try {
    const endpoint: string = [
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
  } catch (error) {
    toast.add({
      title: 'No se pudo guardar',
      description: error instanceof Error ? error.message : 'Error inesperado al guardar.',
      color: 'error',
      icon: 'i-lucide-triangle-alert',
    })
  } finally {
    isSaving.value = false
  }
}

watch(
  [siteId, collectionName],
  () => {
    sections.value = []
    entries.value = []
    formState.value = {}
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
              v-for="entry in entries"
              :key="entry"
              :label="entry"
              :variant="selectedEntrySlug === entry ? 'solid' : 'ghost'"
              color="neutral"
              block
              @click="openEntry(entry)"
            />

            <p v-if="!entries.length" class="text-sm text-muted">No hay entradas aun.</p>
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
            v-if="loadError"
            icon="i-lucide-triangle-alert"
            color="error"
            variant="subtle"
            title="No se pudo cargar la coleccion"
            :description="loadError"
            class="mb-4"
          />

          <template v-if="isLoading">
            <div class="space-y-4">
              <USkeleton class="h-10 w-60" />
              <USkeleton class="h-52 w-full" />
              <USkeleton class="h-52 w-full" />
            </div>
          </template>

          <UAlert
            v-else-if="!selectedEntrySlug"
            icon="i-lucide-info"
            color="info"
            variant="subtle"
            title="Selecciona una entrada"
            description="Elige una entrada del listado o crea una nueva con un slug."
          />

          <EditorDynamicForm
            v-else
            v-model="formState"
            :sections="sections"
            :is-saving="isSaving"
            @submit="saveEntry($event)"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
