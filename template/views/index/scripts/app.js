/* eslint no-unused-vars: ["error", { varsIgnorePattern: "app" }] */
/* global Vue VueRouter data */

import routes from './routes.js'

const router = new VueRouter({
  mode: data.mode,
  base: `/${data.view}/`,
  routes: Object.keys(routes).map(path => {
    const route = routes[path]

    let name = undefined
    let tpath = route

    if (route.push !== undefined) {
      tpath = route[0]

      if (route.length > 1) {
        name = route[1]
      }
    }

    const component = async _ => {
      const req = await axios.get(`/${data.view || 'index'}/@${tpath}.pug`)
      const template = req.data
      return { template, name }
    }

    return { path, name, component }
  })
})

Vue.use(VueProgressBar, {
  color: 'rgb(25, 143, 227)',
  failedColor: 'rgb(255, 28, 104)',
  height: '2px'
})

router.beforeEach((to, from, next) => {
  const eb = VueProgressBarEventBus
  eb.$Progress.start()
  next()
})

router.afterEach((to, from) => {
  const eb = VueProgressBarEventBus

  if (to.name === 'notfound') {
    eb.$Progress.fail()
    return
  }

  eb.$Progress.finish()
})

const app = new Vue({
  router,
}).$mount('#app')
