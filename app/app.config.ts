export default defineAppConfig({
  ui: {
    colors: {
      // primary: 'primary',
      neutral: 'slate',
    },
    page: {
      slots: {
        root: 'w-full max-w-(--ui-container) mx-auto',
      },
    },
    pageHeader: {
      slots: {
        root: 'border-none bg-primary/10 text-primary mt-8 p-6 rounded-lg',
        title: 'text-2xl sm:text-3xl font-semibold',
        description: 'text-xs font-light',
      },
      variants: {
        title: {
          true: {
            description: 'mt-2',
          },
        },
      },
    },
  },
})
