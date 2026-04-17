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
    // Stylistic rules - disable conflicting indent rule
    '@stylistic/comma-dangle': 'off',
  },
})
