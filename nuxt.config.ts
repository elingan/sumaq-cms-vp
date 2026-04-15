// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxtjs/i18n',
    'nuxt-auth-utils',
    '@nuxt/image',
    '@nuxthub/core',
  ],

  devtools: {
    enabled: true,
  },

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/': { prerender: true },
  },

  compatibilityDate: '2025-01-15',

  hub: {
    db: 'sqlite',
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
        arrowParens: true,
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
