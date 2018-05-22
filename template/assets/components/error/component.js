/* global Vue err */
Vue.component(`error`, {
  template: `#template-error`,
  props: {
    err: {
      type: Object,
      default () {
        return !data.err ? {} : data.err
      },
    },
  },
  data () {
    const faces = [ '(;´༎ຶД༎ຶ`)', '⚆ _ ⚆', '｡゜(｀Д´)゜｡', '¬_¬', '(ʘᗩʘ\')', 'ಥ_ಥ', '(ノಠ益ಠ)ノ彡┻━┻', '>.<' ]
    const face  = faces[Math.random() * faces.length ^ 0]

    return { face }
  },
})
