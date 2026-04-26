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
  (e: 'create-site'): void
}>()
</script>

<template>
  <UCard :title="$t('nav.sites')" :description="$t('dashboard.sitesSubtitle')" class="w-full">
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
        <img
          src="https://placehold.co/300x200"
          :alt="site.title"
          class="w-full h-full object-cover"
        />
      </UPageCard>

      <UButton
        v-if="canCreateSites"
        icon="i-lucide-plus"
        :label="$t('actions.createCalendar')"
        @click="emit('create-site')"
      />
    </UPageGrid>

    <UEmpty
      v-if="!hasSites"
      title="No sites"
      description="No sites found. Please contact your administrator."
      variant="soft"
    />
  </UCard>
</template>
