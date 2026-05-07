// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    'vue/max-attributes-per-line': [
      'warn',
      {
        singleline: { max: 3 },
        multiline: { max: 1 },
      },
    ],
    'vue/html-self-closing': [
      'error',
      {
        html: {
          void: 'always',
          normal: 'always',
          component: 'always',
        },
        svg: 'always',
        math: 'always',
      },
    ],
    // Stylistic rules - disable conflicting indent rule
    '@stylistic/comma-dangle': 'off',
    'vue/comma-dangle': 'off',
  },
})
