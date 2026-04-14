import { defineConfig } from 'vite-plus'

export default defineConfig({
  staged: {
    '*': 'vp check --fix',
  },
  fmt: {
    singleQuote: true,
    semi: false,
    commaDangle: 'always-multiline',
    braceStyle: '1tbs',
    arrowParens: 'always',
  },
  lint: { options: { typeAware: true, typeCheck: true } },
})
