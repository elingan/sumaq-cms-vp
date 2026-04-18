<script setup lang="ts">
type SiteCardStatus = 'active' | 'archived'

interface SiteCardSite {
  id: string
  slug: string | null
  name: string
  description: string | null
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

const { t } = useI18n()
const localePath = useLocalePath()

const statusColor = computed(() => (props.site.status === 'active' ? 'success' : 'neutral'))
const sitePath = computed(() => localePath(`/site/${props.site.slug ?? props.site.id}`))
</script>

<template>
  <UPageCard
    :key="props.site.id"
    orientation="horizontal"
    reverse
    variant="soft"
    class="hover:bg-primary/10 cursor-pointer"
  >
    <img src="https://placehold.co/400x300" alt="Tailwind CSS" class="w-full rounded-lg" />
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
    <template #body>
      <p>({{ site.slug ?? site.id }})</p>
      <ULink :to="sitePath" class="text-sm text-muted">
        {{ site.domain ?? site.siteUrl ?? t('sites.noDomain') }}
      </ULink>
      <p>{{ site.description }}</p>

      <div class="text-sm text-muted space-y-1">
        <p v-if="site.domain" class="truncate">
          {{ site.domain }}
        </p>
        <p v-else-if="site.siteUrl" class="truncate">
          {{ site.siteUrl }}
        </p>
        <p v-else class="italic">
          {{ $t('sites.noDomain') }}
        </p>

        <p class="text-xs">
          {{ $t('sites.template') }}: <span class="font-medium">{{ site.template }}</span>
        </p>
      </div>
    </template>

    <template #footer>
      <p class="text-xs text-muted">
        {{ $t('sites.updated') }}: {{ new Date(site.updatedAt).toLocaleDateString() }}
      </p>
    </template>
  </UPageCard>
</template>
