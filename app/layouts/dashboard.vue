<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { useUser, useClerk } from '#imports'

const { t } = useI18n()
const { user } = useUser()
const route = useRoute()
const localePath = useLocalePath()
const clerk = useClerk()

const baseItems = computed<NavigationMenuItem[]>(() => [
  { label: t('nav.dashboard'), icon: 'i-lucide-house', to: localePath('/dashboard') },
  { label: t('nav.sites'), icon: 'i-lucide-globe', to: localePath('/dashboard/sites') },
  { label: t('nav.settings'), icon: 'i-lucide-settings', to: localePath('/settings') },
])

const role = computed(() => user.value?.publicMetadata?.role as string | undefined)

const adminItems = computed<NavigationMenuItem[]>(() =>
  role.value === 'admin'
    ? [
        {
          label: t('nav.admin'),
          icon: 'i-lucide-shield',
          defaultOpen: true,
          children: [
            { label: t('nav.users'), to: localePath('/admin/users') },
            { label: t('nav.sites'), to: localePath('/admin/sites') },
          ],
        },
      ]
    : [],
)

const navItems = computed<NavigationMenuItem[]>(() => [...baseItems.value, ...adminItems.value])

const pageTitle = computed(() => route.meta.title as string | undefined)

async function logout() {
  await clerk.value?.signOut()
  await navigateTo('/auth/login')
}

const availableLocales = [
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
  { value: 'de', label: 'DE' },
]
const { locale, setLocale } = useI18n()
</script>

<template>
  <UApp>
    <UDashboardGroup>
      <UDashboardSidebar collapsible resizable>
        <template #header="{ collapsed }">
          <AppLogo v-if="!collapsed" class="h-5 w-auto" />
          <UIcon v-else name="i-lucide-layout-dashboard" class="text-primary mx-auto size-5" />
        </template>

        <template #default="{ collapsed }">
          <UNavigationMenu :collapsed="collapsed" :items="navItems" orientation="vertical" />
        </template>

        <template #footer="{ collapsed }">
          <UButton
            :label="
              collapsed ? undefined : user?.firstName || user?.emailAddresses[0]?.emailAddress
            "
            :icon="collapsed ? 'i-lucide-user' : undefined"
            color="neutral"
            variant="ghost"
            class="w-full"
            :block="!collapsed"
          />
        </template>
      </UDashboardSidebar>

      <UDashboardPanel>
        <template #header>
          <UDashboardNavbar :title="pageTitle">
            <template #leading>
              <UDashboardSidebarCollapse />
            </template>

            <template #right>
              <!-- Language selector -->
              <USelectMenu
                v-model="locale"
                :items="availableLocales"
                value-key="value"
                size="sm"
                @update:model-value="(v: string) => setLocale(v as 'en' | 'es' | 'de')"
              />

              <UColorModeButton />

              <UButton
                icon="i-lucide-log-out"
                color="neutral"
                variant="ghost"
                :title="t('nav.logout')"
                @click="logout"
              />
            </template>
          </UDashboardNavbar>
        </template>

        <slot />
      </UDashboardPanel>
    </UDashboardGroup>
  </UApp>
</template>
