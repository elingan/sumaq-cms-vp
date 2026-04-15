<template>
  <div>
    <AppHeader />

    <UMain>
      <slot />
    </UMain>

    <AppFooter />
  </div>
</template>

<script setup lang="ts">
// const { loggedIn, user } = useUserSession()
// const router = useRouter()

// const userMenuItems = computed(() => [
//   [{
//     label: user.value?.email || '',
//     slot: 'account',
//     disabled: true
//   }],
//   [{
//     label: 'Dashboard',
//     icon: 'i-heroicons-home',
//     click: () => router.push('/dashboard')
//   }, {
//     label: 'Settings',
//     icon: 'i-heroicons-cog-6-tooth',
//     click: () => router.push('/settings')
//   }],
//   [{
//     label: 'Logout',
//     icon: 'i-heroicons-arrow-right-on-rectangle',
//     click: async () => {
//       await $fetch('/api/auth/logout', { method: 'POST' })
//       await router.push('/login')
//     }
//   }]
// ])
</script>
