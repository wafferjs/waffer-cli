/* eslint no-unused-vars: ["error", { varsIgnorePattern: "app" }] */
/* global Vue VueRouter data */

import routes from './routes.js'

const router = new VueRouter({
  mode: data.mode,
  base: `/${data.view}/`,
  routes: routes,
})

const app = new Vue({
  router,
}).$mount('#app')
