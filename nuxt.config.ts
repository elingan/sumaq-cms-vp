// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxtjs/i18n', 'nuxt-auth-utils', '@nuxt/image'],

  devtools: {
    enabled: true,
  },

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/': { prerender: true },
  },

  compatibilityDate: '2025-01-15',

  nitro: {
    externals: {
      // PGlite must NOT be inlined — it resolves pglite.data relative to its own dist/
      external: ['@electric-sql/pglite'],
    },
    serverAssets: [
      {
        baseName: 'pglite',
        dir: './node_modules/@electric-sql/pglite/dist',
      },
    ],
  },

  vite: {
    optimizeDeps: {
      include: ['zod'],
    },
  },

  eslint: {
    config: {
      stylistic: {
        quotes: 'single',
        semi: false,
        commaDangle: 'always-multiline',
        braceStyle: '1tbs',
      },
    },
  },

  i18n: {
    strategy: 'no_prefix',
    langDir: 'locales',
    defaultLocale: 'en',
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'es', name: 'Español', file: 'es.json' },
      { code: 'de', name: 'Deutsch', file: 'de.json' },
    ],
    // detectBrowserLanguage: {
    //   useCookie: true,
    //   cookieKey: 'i18n_redirected',
    //   redirectOn: 'root',
    //   alwaysRedirect: false,
    //   fallbackLocale: 'en',
    // },
    compilation: {
      escapeHtml: false,
      strictMessage: false,
    },
  },
})
