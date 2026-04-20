<script setup lang="ts">
import type { SiteCmsNavigation } from '#shared/types/cms'

definePageMeta({ layout: 'site' })

const route = useRoute()
const router = useRouter()
const toast = useToast()

const slug = computed(() => route.params.slug as string)
const collectionName = computed(() => route.params.name as string)
const selectedEntrySlug = computed(() => route.params.entry as string | undefined)

const { data: siteCms, error: siteCmsError } = await useFetch<SiteCmsNavigation>(
  () => `/api/sites/slug/${slug.value}/cms`,
  {
    watch: [slug],
    key: `site-cms-collection-${slug.value}`,
  },
)

const siteId = computed(() => siteCms.value?.site.id ?? null)
const entriesState = useEditorState<string[]>()
const draftSlug = ref('')
const collectionExists = computed(() => {
  return (siteCms.value?.collections ?? []).some((entry) => entry.name === collectionName.value)
})

const collectionPath = computed(() => `/site/${slug.value}/collection/${collectionName.value}`)

const collectionError = computed(() => {
  if (siteCmsError.value) {
    return null
  }

  if (siteCms.value && !collectionExists.value) {
    return `La colección "${collectionName.value}" no existe.`
  }

  return entriesState.error.value
})

function buildEntryPath(entry: string) {
  return `${collectionPath.value}/${entry}`
}

async function loadEntries() {
  if (!siteId.value || !collectionExists.value) {
    entriesState.reset()
    return
  }

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

async function ensureSelectedEntry() {
  const entries = entriesState.data.value ?? []

  if (!entries.length) {
    if (selectedEntrySlug.value) {
      await router.replace(collectionPath.value)
    }
    return
  }

  if (selectedEntrySlug.value && entries.includes(selectedEntrySlug.value)) {
    return
  }

  if (selectedEntrySlug.value) {
    toast.add({
      title: 'Entrada no encontrada',
      description: `La entrada "${selectedEntrySlug.value}" no existe en esta colección.`,
      color: 'warning',
      icon: 'i-lucide-info',
    })
  }

  await router.replace(buildEntryPath(entries[0] as string))
}

async function openEntry(nextSlug: string) {
  await router.push(buildEntryPath(nextSlug))
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

  if (entriesState.data.value?.includes(normalized)) {
    toast.add({
      title: 'Slug duplicado',
      description: 'Ya existe una entrada con ese slug.',
      color: 'warning',
      icon: 'i-lucide-info',
    })
    return
  }

  draftSlug.value = ''
  await openEntry(normalized)
}

watch(
  [siteId, collectionName],
  async () => {
    entriesState.reset()

    await loadEntries()
    await ensureSelectedEntry()
  },
  { immediate: true },
)

watch(selectedEntrySlug, async () => {
  if (!collectionExists.value || entriesState.isLoading.value) {
    return
  }

  await ensureSelectedEntry()
})

useHead(() => ({
  title: `${collectionName.value} — Collection`,
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
              v-for="entry in entriesState.data.value ?? []"
              :key="entry"
              :label="entry"
              :variant="selectedEntrySlug === entry ? 'solid' : 'ghost'"
              color="neutral"
              block
              @click="openEntry(entry)"
            />

            <p v-if="(entriesState.data.value?.length ?? 0) === 0" class="text-sm text-muted">
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
            v-else-if="collectionError"
            icon="i-lucide-triangle-alert"
            color="error"
            variant="subtle"
            title="No se pudo cargar la colección"
            :description="collectionError"
            class="mb-4"
          />

          <template v-else-if="entriesState.isLoading.value">
            <div class="space-y-4">
              <USkeleton class="h-10 w-60" />
              <USkeleton class="h-52 w-full" />
              <USkeleton class="h-52 w-full" />
            </div>
          </template>

          <UAlert
            v-else-if="(entriesState.data.value?.length ?? 0) === 0"
            icon="i-lucide-info"
            color="info"
            variant="subtle"
            title="No hay entradas"
            description="Crea la primera entrada para esta colección usando un slug."
            class="mb-4"
          />

          <NuxtPage v-else />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
