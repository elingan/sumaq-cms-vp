<script setup>
useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  link: [{ rel: 'icon', href: '/favicon.ico' }],
  htmlAttrs: { lang: 'en' },
})

useSeoMeta({
  title: 'Sumaq CMS',
  description: 'Git-based headless CMS for modern static sites.',
  ogTitle: 'Sumaq CMS',
  ogDescription: 'Git-based headless CMS for modern static sites.',
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
