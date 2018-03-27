export default [
  { path: '/',
    component: {
      template: `#template-index`,
    },
  },
  { path: '*', component: { template: `#template-404` } },
]
