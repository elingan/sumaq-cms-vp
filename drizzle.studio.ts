import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: '.nuxt/hub/db/schema.mjs',
  dbCredentials: {
    url: 'file:/home/eduardo/Workspace/sumaq/sumaq-cms-vp/.data/db/sqlite.db',
  },
})
