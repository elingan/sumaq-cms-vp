import { defineConfig } from 'vite-plus'

export default defineConfig({
  staged: {
    '*': 'vp check --fix',
  },
  fmt: {
    ignorePatterns: ['app-previous-editor/**'],
    singleQuote: true,
    semi: false,
    commaDangle: 'never',
    braceStyle: '1tbs',
    arrowParens: 'always',
  },
  lint: {
    ignorePatterns: ['app-previous-editor/**'],
    options: { typeAware: true, typeCheck: true },
  },
})
