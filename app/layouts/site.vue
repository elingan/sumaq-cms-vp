<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <!-- <TeamsMenu :collapsed="collapsed" /> -->
        <p>Sitio Web</p>
      </template>

      <template #default="{ collapsed }">
        <!-- <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" /> -->

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links"
          orientation="vertical"
          tooltip
          popover
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="supportLinks"
          orientation="vertical"
          tooltip
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <!-- <UDashboardSearch :groups="groups" /> -->

    <slot />

    <!-- <NotificationsSlideover /> -->
  </UDashboardGroup>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

// const route = useRoute()
// const toast = useToast()

const open = ref(false)

const links = [
  [
    {
      label: 'Content',
      type: 'label',
    },
    {
      label: 'Pages',
      icon: 'i-lucide-file-text',
      to: '/settings',
      badge: '3',
      defaultOpen: true,
      onSelect: () => {
        open.value = false
      },
      children: [
        {
          label: 'Index',
          to: '/settings',
          exact: true,
          onSelect: () => {
            open.value = false
          },
        },
        {
          label: 'Privacy',
          to: '/settings/members',
          onSelect: () => {
            open.value = false
          },
        },
        {
          label: 'Terms',
          to: '/settings/notifications',
          onSelect: () => {
            open.value = false
          },
        },
      ],
    },
    {
      label: 'Groups',
      icon: 'i-lucide-file-text',
      to: '/settings',
      badge: '1',
      defaultOpen: true,
      onSelect: () => {
        open.value = false
      },
      children: [
        {
          label: 'Teams',
          to: '/settings',
          exact: true,
          onSelect: () => {
            open.value = false
          },
        },
      ],
    },
  ],
  [
    {
      label: 'Media',
      type: 'label',
    },
    {
      label: 'Images',
      icon: 'i-lucide-image',
      to: '/settings',
      onSelect: () => {
        open.value = false
      },
    },
    {
      label: 'Icons',
      icon: 'i-lucide-image',
      to: '/settings',
      onSelect: () => {
        open.value = false
      },
    },
    {
      label: 'Videos',
      icon: 'i-lucide-video',
      to: '/settings',
      onSelect: () => {
        open.value = false
      },
    },
  ],
  [
    {
      label: 'Admin',
      type: 'label',
    },
    {
      label: 'Configuration',
      icon: 'i-lucide-settings',
      to: '/settings',
      onSelect: () => {
        open.value = false
      },
    },
    {
      label: 'Members',
      icon: 'i-lucide-users',
      to: '/settings/members',
      onSelect: () => {
        open.value = false
      },
    },
    {
      label: 'Actions',
      icon: 'i-lucide-zap',
      to: '/settings',
      onSelect: () => {
        open.value = false
      },
    },
  ],
] satisfies NavigationMenuItem[][]

const supportLinks = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Feedback',
    icon: 'i-lucide-message-circle',
    to: 'https://github.com/nuxt-ui-templates/dashboard',
    target: '_blank',
  },
  {
    label: 'Help & Support',
    icon: 'i-lucide-info',
    to: 'https://github.com/nuxt-ui-templates/dashboard',
    target: '_blank',
  },
])
// const groups = computed(() => [
//   {
//     id: 'links',
//     label: 'Go to',
//     items: links.flat(),
//   },
//   {
//     id: 'code',
//     label: 'Code',
//     items: [
//       {
//         id: 'source',
//         label: 'View page source',
//         icon: 'i-simple-icons-github',
//         to: `https://github.com/nuxt-ui-templates/dashboard/blob/main/app/pages${route.path === '/' ? '/index' : route.path}.vue`,
//         target: '_blank',
//       },
//     ],
//   },
// ])

// onMounted(async () => {
//   const cookie = useCookie('cookie-consent')
//   if (cookie.value === 'accepted') {
//     return
//   }

//   toast.add({
//     title: 'We use first-party cookies to enhance your experience on our website.',
//     duration: 0,
//     close: false,
//     actions: [
//       {
//         label: 'Accept',
//         color: 'neutral',
//         variant: 'outline',
//         onClick: () => {
//           cookie.value = 'accepted'
//         },
//       },
//       {
//         label: 'Opt out',
//         color: 'neutral',
//         variant: 'ghost',
//       },
//     ],
//   })
// })
</script>
