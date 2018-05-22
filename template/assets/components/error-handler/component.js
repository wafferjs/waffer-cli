/* global Vue */
Vue.component(`error-handler`, {
  functional: true,
  render (h, ctx) {
    if (this.hasError()) {
      return h('error')
    }

    return ctx.slots().default
  },
  methods: {
    hasError () {
      return !!data.err
    },
  },
})
