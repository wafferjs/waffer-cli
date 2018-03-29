/* global Vue */
Vue.component(`error-handler`, {
  functional: true,
  render (h, ctx) {
    if (typeof err !== 'undefined') {
      return h('error')
    }

    return ctx.slots().default
  },
  methods: {
    hasError () {
      return typeof err !== 'undefined'
    },
  },
})
