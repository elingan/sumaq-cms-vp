<script setup lang="ts">
type SiteCardStatus = 'active' | 'archived'

interface SiteCardSite {
  id: string
  name: string
  domain: string | null
  siteUrl: string | null
  template: string
  status: SiteCardStatus
  updatedAt: string | Date
}

interface Props {
  site: SiteCardSite
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'refresh'): void
}>()

const { t } = useI18n()

const statusColor = computed(() => (props.site.status === 'active' ? 'success' : 'neutral'))
</script>

<template>
  <UCard class="hover:shadow-md transition-shadow cursor-pointer" :to="`/site/${site.id}`">
    <template #header>
      <div class="flex items-start justify-between gap-2">
        <h3 class="font-semibold truncate">
          {{ site.name }}
        </h3>
        <UBadge :color="statusColor" variant="subtle" size="sm">
          {{ t(`status.${site.status}`) }}
        </UBadge>
      </div>
    </template>
    <p>({{ site.id }})</p>
    <ULink :to="`/site/${site.id}`" class="text-sm text-muted">
      {{ site.domain ?? site.siteUrl ?? t('sites.noDomain') }}
    </ULink>

    <div class="text-sm text-muted space-y-1">
      <p v-if="site.domain" class="truncate">
        {{ site.domain }}
      </p>
      <p v-else-if="site.siteUrl" class="truncate">
        {{ site.siteUrl }}
      </p>
      <p v-else class="italic">
        {{ t('sites.noDomain') }}
      </p>

      <p class="text-xs">
        {{ t('sites.template') }}: <span class="font-medium">{{ site.template }}</span>
      </p>
    </div>

    <template #footer>
      <p class="text-xs text-muted">
        {{ t('sites.updated') }}: {{ new Date(site.updatedAt).toLocaleDateString() }}
      </p>
    </template>
  </UCard>
</template>
