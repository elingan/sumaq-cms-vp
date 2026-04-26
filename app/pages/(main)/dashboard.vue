<template>
  <UPage>
    <!-- <UPageHeader
      :title="$t('nav.sites')"
      :description="$t('dashboard.sitesSubtitle')"
      :ui="{
        root: 'border-none py-4',
        container: 'max-w-(--ui-container) px-4 sm:px-6 lg:px-8 ',
        description: 'mt-0',
      }"
    /> -->

    <div class="space-y-8 mt-8 mb-16">
      <UCard :title="$t('nav.sites')" :description="$t('dashboard.sitesSubtitle')" class="w-full">
        <UPageGrid>
          <!-- <SitesSiteCard
            v-for="site in sites"
            :key="site.id"
            :site="site"
            :orientation="orientation"
            @refresh="refresh"
          /> -->
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
            @click="showCreateModal = true"
          />
        </UPageGrid>
        <UEmpty
          v-if="!sites?.length"
          title="No sites"
          description="No sites found. Please contact your administrator."
          variant="soft"
        />
      </UCard>
      <UCard
        :title="$t('nav.calendar')"
        :description="$t('dashboard.calendarSubtitle')"
        class="w-full"
      >
        <UEmpty
          title="No Calendar"
          description="No calendar found. Please contact your administrator."
          variant="soft"
        />
      </UCard>
      <!-- <UPageHeader :title="$t('nav.sites')" :description="$t('dashboard.sitesSubtitle')">
        <template #links>
          <UButton
            v-if="canCreateSites"
            icon="i-lucide-plus"
            :label="$t('actions.createSite')"
            @click="showCreateModal = true"
          />
        </template>
      </UPageHeader>

      <UPageGrid>
        <SitesSiteCard
          v-for="site in sites"
          :key="site.id"
          :site="site"
          :orientation="orientation"
          @refresh="refresh"
        />
      </UPageGrid>

      <UPageCTA
        v-if="!sites?.length"
        title="Trusted and supported by our amazing community"
        description="We've built a strong, lasting partnership. Their trust is our driving force, propelling us towards shared success."
        :links="siteLinks"
      /> -->
      <div v-if="pendingSites" class="flex justify-center">
        <UIcon name="i-lucide-loader-circle" class="animate-spin size-8 text-muted" />
      </div>
    </div>
    <!-- <div class="space-y-8 mb-16">
      <UPageHeader :title="$t('nav.calendar')" :description="$t('dashboard.calendarSubtitle')">
        <template #links>
          <UButton
            v-if="canCreateSites"
            icon="i-lucide-plus"
            :label="$t('actions.createCalendar')"
            @click="showCreateModal = true"
          />
        </template>
      </UPageHeader>
      <UPageCTA
        title="Trusted and supported by our amazing community"
        description="We've built a strong, lasting partnership. Their trust is our driving force, propelling us towards shared success."
        :links="siteLinks"
      />
    </div> -->

    <SitesSiteForm v-model:open="showCreateModal" @saved="handleSiteSaved" />
  </UPage>
</template>

<script setup lang="ts">
import type { ButtonProps } from '@nuxt/ui'

definePageMeta({ layout: 'default', title: 'Dashboard' })

const { canCreateSites } = useRole()
const showCreateModal = ref(false)

const { data: sites, refresh, pending: pendingSites } = await useFetch('/api/sites')

const siteCards = computed(() => {
  const items = sites.value?.map((site) => {
    return {
      id: site.id,
      to: `/site/${site.slug}`,
      slug: site.slug,
      title: site.name,
      description: site.description,
      imageUrl: site.screenshotUrl ?? 'https://placeholder.co/300x200',
      status: site.status,
      updatedAt: site.updatedAt,
    }
  })

  return items
})

const orientation = computed(() =>
  sites.value && sites.value.length > 1 ? 'vertical' : 'horizontal',
)

const siteLinks = ref<ButtonProps[]>([
  {
    label: 'Get started',
    color: 'primary',
    variant: 'solid',
    trailingIcon: 'i-lucide-plus',
  },
  {
    label: 'Learn more',
    color: 'neutral',
    variant: 'subtle',
    trailingIcon: 'i-lucide-arrow-right',
  },
])

function handleSiteSaved() {
  refresh()
}
</script>
