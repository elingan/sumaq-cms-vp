// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxthub/core',
    '@nuxtjs/i18n',
    'nuxt-auth-utils',
    '@nuxt/image',
  ],

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
      // PGlite includes WASM – must NOT be bundled by Rollup/Nitro
      inline: ['@electric-sql/pglite'],
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
    defaultLocale: 'en',
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'es', name: 'Español', file: 'es.json' },
      { code: 'de', name: 'Deutsch', file: 'de.json' },
    ],
    langDir: './app/i18n',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
      alwaysRedirect: false,
      fallbackLocale: 'en',
    },
  },
})
