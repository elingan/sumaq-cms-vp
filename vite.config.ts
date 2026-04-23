import { defineConfig } from 'vite-plus'

export default defineConfig({
  staged: {
    '*': 'vp check --fix',
  },
  fmt: {
    ignorePatterns: ['.agents/skills/**', 'playwright.config.ts', 'e2e/**'],
    singleQuote: true,
    semi: false,
    commaDangle: 'never',
    braceStyle: '1tbs',
    arrowParens: 'always',
  },
  lint: {
    ignorePatterns: ['.agents/skills/**', 'playwright.config.ts', 'e2e/**'],
    options: { typeAware: true, typeCheck: true },
  },
})
