<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div>
          <h2 class="text-lg font-semibold text-foreground">
            {{ $t('dashboard.sites') }}
          </h2>
          <p class="text-sm text-muted">
            {{ $t('dashboard.sitesSubtitle') }}
          </p>
        </div>
        <UButton
          v-if="canCreateSites"
          icon="i-lucide-plus"
          :label="$t('actions.createSite')"
          @click="showCreateModal = true"
        />
      </div>
    </template>

    <UPageGrid>
      <UPageCard
        v-for="site in siteCards"
        :key="site.id"
        :to="site.to"
        target="_self"
        :title="site.title"
        :description="site.description ?? ''"
        :badge="site.status"
        :badge-color="site.status"
        reverse
        variant="soft"
      >
        <NuxtImg
          src="https://placehold.co/300x200"
          :alt="site.title"
          placeholder
          height="200"
          class="w-full object-cover rounded-lg"
        />
      </UPageCard>
    </UPageGrid>

    <UEmpty
      v-if="!hasSites"
      title="No sites"
      description="No sites found. Please contact your administrator."
      variant="soft"
    />
  </UCard>

  <SiteFormCreate v-model:open="showCreateModal" @saved="handleSiteSaved" />
</template>

<script setup lang="ts">
interface SiteCardItem {
  id: string
  to: string
  title: string
  description?: string | null
  status: 'active' | 'archived'
}

interface Props {
  siteCards?: SiteCardItem[]
  canCreateSites: boolean
  hasSites: boolean
}

withDefaults(defineProps<Props>(), {
  siteCards: () => [],
})

const emit = defineEmits<{
  (e: 'site-created'): void
}>()

const showCreateModal = ref(false)

function handleSiteSaved() {
  emit('site-created')
}
</script>
